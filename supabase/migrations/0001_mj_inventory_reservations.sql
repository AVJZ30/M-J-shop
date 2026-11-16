-- M&J SHOP: staging migration for a dedicated Supabase project.
-- Do not apply to another app's database. This file is NOT executed by GitHub/Netlify.
create schema if not exists mj_private;

create table if not exists mj_private.products (
  id text primary key,
  name text not null,
  size text not null,
  price numeric(10,2) not null check (price>=0),
  image_url text,
  stock integer not null default 0 check (stock>=0),
  is_sold boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists mj_private.holds (
  session_id uuid not null,
  product_id text not null references mj_private.products(id) on delete cascade,
  qty integer not null check (qty>=1 and qty<=20),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key(session_id,product_id)
);
create index if not exists holds_product_expiry_idx on mj_private.holds(product_id,expires_at);
alter table mj_private.products enable row level security;
alter table mj_private.holds enable row level security;
revoke all on schema mj_private from public, anon, authenticated;
revoke all on all tables in schema mj_private from public, anon, authenticated;
grant usage on schema mj_private to service_role;
grant all on all tables in schema mj_private to service_role;

-- Snapshot is public-facing through your server only. Counts active holds.
create or replace function mj_private.inventory_snapshot()
returns jsonb language sql stable set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'stock',p.stock,'available',
    greatest(0,p.stock-coalesce(h.reserved,0)),
    'sold',p.is_sold,'updated_at',p.updated_at
  ) order by p.id),'[]'::jsonb)
  from mj_private.products p
  left join (
    select product_id,sum(qty)::integer as reserved
    from mj_private.holds where expires_at>now()
    group by product_id
  ) h on h.product_id=p.id
$$;

-- Atomic replacement of the session's full cart. All products are locked
-- in deterministic order. A concurrent buyer cannot reserve the same unit.
-- Sessions last 10 minutes and may be renewed by sending the cart again.
create or replace function mj_private.reserve_cart(
  p_session uuid, p_items jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  item record;
  p record;
  n integer;
  held integer;
  result jsonb:='[]'::jsonb;
begin
  if p_session is null or p_items is null or jsonb_typeof(p_items)<>'array'
     or jsonb_array_length(p_items)>30 then
    raise exception 'invalid_cart';
  end if;
  -- Prevent simultaneous mutations from the same browser session.
  perform pg_advisory_xact_lock(hashtextextended(p_session::text, 6174));
  create temporary table if not exists pg_temp.mj_requested(
    id text primary key, qty integer not null
  ) on commit drop;
  truncate table pg_temp.mj_requested;
  for item in select * from jsonb_to_recordset(p_items) as x(id text,qty integer)
  loop
    if item.id is null or length(item.id)>100 or item.qty is null
       or item.qty < 1 or item.qty > 20 then
       raise exception 'invalid_qty';
    end if;
    insert into pg_temp.mj_requested(id,qty) values(item.id,item.qty);
  end loop;
  -- Lock every product row before counting existing reservations.
  perform 1 from mj_private.products
  where id in (
    select id from pg_temp.mj_requested
    union select product_id from mj_private.holds where session_id=p_session
  )
  order by id for update;
  delete from mj_private.holds where session_id=p_session;
  for item in select * from pg_temp.mj_requested order by id loop
    select * into p from mj_private.products where id=item.id;
    if not found or p.is_sold then raise exception 'not_available'; end if;
    select coalesce(sum(qty),0)::integer into held from mj_private.holds
      where product_id=item.id and expires_at>now();
    n:=p.stock-held;
    if item.qty>n then raise exception 'not_enough_stock: % (% remaining)', item.id,n; end if;
    insert into mj_private.holds(session_id,product_id,qty,expires_at)
      values(p_session,item.id,item.qty,now()+interval '10 minutes');
    result:=result||jsonb_build_array(jsonb_build_object(
      'id',item.id,'quantity',item.qty,'remaining',n-item.qty
    ));
  end loop;
  return result;
end $$;

-- Limit execution to trusted server credentials. Never expose a secret API key to visitors.
revoke all on function mj_private.reserve_cart(uuid,jsonb) from public,anon,authenticated;
revoke all on function mj_private.inventory_snapshot() from public,anon,authenticated;
grant execute on function mj_private.reserve_cart(uuid,jsonb) to service_role;
grant execute on function mj_private.inventory_snapshot() to service_role;

-- The final sale needs an authenticated admin action in a subsequent migration:
-- confirm payment/order and decrement stock while holding the same product locks.
-- Reservations expire after 10 minutes and are not sales.