import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';
export const supabase=createClient('https://jqvcsggwnhqjvmbplwhv.supabase.co','sb_publishable_5jNlD4ddBhjFtMMihZwffQ_6zH2NJT2',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
export const categories=async()=>{const {data,error}=await supabase.from('mj_categories').select('id,name,sort_order').order('sort_order');if(error)throw error;return data||[]};
export const sessionId=()=>{const key='mjshop-hold-session-v1';let id=sessionStorage.getItem(key);if(!id){id=crypto.randomUUID();sessionStorage.setItem(key,id)}return id};
export async function catalog(){const {data,error}=await supabase.rpc('mj_public_catalog',{p_session:null});if(error)throw error;return (data||[]).filter(p=>p.is_visible).map(p=>({...p,category_id:p.category_id,status:p.is_sold||p.stock<=0?'sold':'available',stock:p.available,rawStock:p.stock,image:p.image_url||'images/placeholder.svg',createdAt:Date.parse(p.created_at)||0}))}
export const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const imageUrl=s=>{try{if(!s)return 'images/placeholder.svg';const u=new URL(s,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'images/placeholder.svg'}catch{return 'images/placeholder.svg'}};

// Opciones de color de cada prenda: nombre + hexadecimal para mostrar la muestra real.
export function productColors(p){const list=Array.isArray(p?.colors)?p.colors:[];const seen=new Set();return list.filter(x=>x&&typeof x.name==='string'&&typeof x.hex==='string').map(x=>({name:x.name.trim().slice(0,36),hex:x.hex.toUpperCase()})).filter(x=>{if(!x.name||!/^#[0-9A-F]{6}$/.test(x.hex)||seen.has(x.name.toLowerCase()))return false;seen.add(x.name.toLowerCase());return true}).slice(0,20)}
export const defaultColor=p=>productColors(p)[0]?.name||'';
export const normalizeCart=(items)=>Array.isArray(items)?items.map(x=>typeof x==='string'?{id:x,color:''}:x&&typeof x.id==='string'?{id:x.id,color:typeof x.color==='string'?x.color:''}:null).filter(Boolean):[];
export const colorSwatches=(p,selected='',type='radio')=>{const list=productColors(p);return list.map(c=>'<button type="button" class="color-swatch'+(selected===c.name?' is-selected':'')+'" data-color="'+esc(c.name)+'" style="--swatch:'+c.hex+'" title="'+esc(c.name)+'" aria-label="Color '+esc(c.name)+'" aria-pressed="'+(selected===c.name)+'"><span></span></button>').join('')};
