import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';
export const supabase=createClient('https://jqvcsggwnhqjvmbplwhv.supabase.co','sb_publishable_5jNlD4ddBhjFtMMihZwffQ_6zH2NJT2',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
export const categories=async()=>{const {data,error}=await supabase.from('mj_categories').select('id,name,sort_order').order('sort_order');if(error)throw error;return data||[]};
export const sessionId=()=>{const key='mjshop-hold-session-v1';let id=sessionStorage.getItem(key);if(!id){id=crypto.randomUUID();sessionStorage.setItem(key,id)}return id};
export async function catalog(){const {data,error}=await supabase.rpc('mj_public_catalog',{p_session:null});if(error)throw error;return (data||[]).filter(p=>p.is_visible).map(p=>({...p,category_id:p.category_id,status:p.is_sold||p.stock<=0?'sold':'available',stock:p.available,rawStock:p.stock,image:p.image_url||'images/placeholder.svg',createdAt:Date.parse(p.created_at)||0}))}
export const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const imageUrl=s=>{try{if(!s)return 'images/placeholder.svg';const u=new URL(s,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'images/placeholder.svg'}catch{return 'images/placeholder.svg'}};

// Opciones de color de cada prenda: nombre + hexadecimal para mostrar la muestra real.
// En prendas con variantes, cada color tiene unidades propias y estado vendido.
// Migración de colores antiguos: sus unidades originales se asignan al primer color.
export function productColors(p){const input=Array.isArray(p?.colors)?p.colors:[],seen=new Set();return input.filter(c=>c&&typeof c.name==='string'&&typeof c.hex==='string').map((c,i)=>({name:c.name.trim().slice(0,36),hex:c.hex.toUpperCase(),stock:Number.isInteger(Number(c.stock))&&c.stock!==undefined&&c.stock!==null?Math.max(0,Math.floor(Number(c.stock))):i===0?Math.max(0,Math.floor(Number(p?.stock)||0)):0,sold:c.sold===true})).filter(c=>{if(!c.name||!/^#[0-9A-F]{6}$/.test(c.hex)||seen.has(c.name.toLowerCase()))return false;seen.add(c.name.toLowerCase());return true}).slice(0,20)}
export const colorAvailable=c=>!!c&&!c.sold&&c.stock>0;
export const productAvailable=p=>{const colors=productColors(p);return !p?.is_sold&&(colors.length?colors.some(colorAvailable):Number(p?.stock)>0)};
export const availableCount=p=>{const colors=productColors(p);return colors.length?colors.reduce((sum,c)=>sum+(colorAvailable(c)?c.stock:0),0):Math.max(0,Number(p?.stock)||0)};
export const defaultColor=p=>productColors(p).find(colorAvailable)?.name||productColors(p)[0]?.name||'';
export const normalizeCart=items=>Array.isArray(items)?items.map(x=>typeof x==='string'?{id:x,color:''}:x&&typeof x.id==='string'?{id:x.id,color:typeof x.color==='string'?x.color:''}:null).filter(Boolean):[];
export function colorSwatches(p,selected=''){return productColors(p).map(c=>{const sold=!colorAvailable(c),label=c.name+(sold?' · Vendido':' · '+c.stock+' disponibles');return '<button type="button" class="color-swatch'+(selected===c.name?' is-selected':'')+(sold?' is-sold':'')+'" data-color="'+esc(c.name)+'" style="--swatch:'+c.hex+'" title="'+esc(label)+'" aria-label="Color '+esc(label)+'" aria-pressed="'+(selected===c.name)+'"'+(sold?' disabled':'')+'><span></span></button>'}).join('')}
