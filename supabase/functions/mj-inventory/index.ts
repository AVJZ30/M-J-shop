// Supabase Edge Function scaffold for a *dedicated* M&J project.
// Must be deployed with configured MJ_ALLOWED_ORIGIN and a server-only service role key.
// The mj_private schema must be exposed ONLY to the backend connection,
// not to the anonymous Data API. An external DB connection or a secure public-schema
// SECURITY DEFINER wrapper restricted to service_role may be needed depending on
// the project's Data API schema settings.
// Never deploy without abuse/rate-limit protection and server-side auth review.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const origin = Deno.env.get("MJ_ALLOWED_ORIGIN") ?? "";
const url = Deno.env.get("SUPABASE_URL") ?? "";
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: "mj_private" }
});

function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    Vary: "Origin"
  }});
}

Deno.serve(async req => {
  if (!origin || req.headers.get("origin") !== origin) return respond({ error: "origin_not_allowed" }, 403);
  if (req.method === "OPTIONS") return respond({ ok: true });
  if (!url || !key) return respond({ error: "service_not_configured" }, 503);
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase.rpc("inventory_snapshot");
      return error ? respond({ error: "inventory_unavailable" }, 503) : respond({ products: data });
    }
    if (req.method === "POST") {
      const body = await req.json();
      if (typeof body.session !== "string" || !/^[0-9a-f-]{36}$/i.test(body.session)
          || !Array.isArray(body.items) || body.items.length > 30) {
        return respond({ error: "invalid_cart" }, 400);
      }
      const items = body.items.map((x: {id?: unknown, qty?: unknown}) => ({ id: x.id, qty: x.qty }));
      const { data, error } = await supabase.rpc("reserve_cart", {
        p_session: body.session, p_items: items
      });
      return error ? respond({ error: "reservation_unavailable", detail: error.message }, 409)
                   : respond({ reserved: data, expiresInSeconds: 600 });
    }
    return respond({ error: "method_not_allowed" }, 405);
  } catch {
    return respond({ error: "invalid_request" }, 400);
  }
});