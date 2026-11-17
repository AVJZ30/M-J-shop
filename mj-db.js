import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';
export const supabase=createClient('https://jqvcsggwnhqjvmbplwhv.supabase.co','sb_publishable_5jNlD4ddBhjFtMMihZwffQ_6zH2NJT2',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
export const categories=async()=>{const {data,error}=await supabase.from('mj_categories').select('id,name,sort_order').order('sort_order');if(error)throw error;return data||[]};
export const sessionId=()=>{const key='mjshop-hold-session-v1';let id=sessionStorage.getItem(key);if(!id){id=crypto.randomUUID();sessionStorage.setItem(key,id)}return id};
export async function catalog(){const {data,error}=await supabase.rpc('mj_public_catalog',{p_session:sessionId()});if(error)throw error;return (data||[]).map(p=>({...p,category_id:p.category_id,status:p.is_sold||p.available<=0?'sold':'available',stock:p.available,rawStock:p.stock,image:p.image_url||'images/placeholder.svg',createdAt:Date.parse(p.created_at)||0}))}
export async function reserve(items){const {data,error}=await supabase.rpc('mj_reserve_cart',{p_session:sessionId(),p_items:items});if(error)throw error;return data}
export const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const imageUrl=s=>{try{const u=new URL(s,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'images/placeholder.svg'}catch{return 'images/placeholder.svg'}};
