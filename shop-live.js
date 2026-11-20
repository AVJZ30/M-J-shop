import {categories as getCategories,catalog as getCatalog,money,esc,imageUrl,productColors,defaultColor,normalizeCart,colorSwatches,productAvailable,availableCount,colorAvailable,productSold} from './mj-db.js';
const $=s=>document.querySelector(s);
const CART='mjshop-live-cart-v1';
let products=[],cats=[],cart=[],filter='all',search='',busy=false,loaded=false;const selectedColors=new Map();
try{cart=normalizeCart(JSON.parse(localStorage.getItem(CART)))}catch{}
function save(){localStorage.setItem(CART,JSON.stringify(cart))}
function counts(items=cart){const m=new Map();for(const item of items)m.set(item.id,(m.get(item.id)||0)+1);return m}
function grouped(){const m=new Map();for(const item of cart){const color=item.color||'';const key=item.id+'|'+color;const prev=m.get(key);if(prev)prev.qty++;else m.set(key,{p:products.find(p=>p.id===item.id),qty:1,color})}return [...m.values()].filter(x=>x.p)}
function pickedColor(p){const options=productColors(p);const current=selectedColors.get(p.id);return options.some(c=>c.name===current&&colorAvailable(c))?current:defaultColor(p)}
function productColorUI(p){
 const colors=productColors(p);if(!colors.length)return '<div class="product-color-choices product-color-empty" aria-hidden="true"></div>';
 const name=pickedColor(p),soldColors=colors.filter(c=>c.sold).map(c=>c.name);
 return '<div class="product-color-choices" data-color-parent="'+p.id+'"><span class="color-label">Colores · <span class="color-selected-name">'+esc(name)+'</span></span>'+colorSwatches(p,name)+(soldColors.length?'<span class="sold-color-note">No disponible: '+esc(soldColors.join(', '))+'</span>':'')+'</div>';
}
const soldOut=p=>productSold(p);
const status=p=>!productAvailable(p);
function soldBadgeStyle(c){
 if(!c)return '';
 const rgb=[1,3,5].map(n=>parseInt(c.hex.slice(n,n+2),16)/255);
 const lum=rgb.map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
 const light=lum[0]*.2126+lum[1]*.7152+lum[2]*.0722;
 return ' style="--sold-tone:'+c.hex+';--sold-ink:'+(light>.44?'#322b28':'#fff')+'"';
}
function productCard(p,soldOnlyColor='',soldSection=false){
 const colors=productColors(p),sold=soldSection,unavailable=!productAvailable(p);
 const selectedSold=colors.find(c=>c.name===soldOnlyColor);
 const badgeColor=selectedSold||(sold&&colors.length===1?colors[0]:null);
 const badge=sold?'<span class="chip sold-chip'+(badgeColor?' sold-chip-color':'')+'"'+soldBadgeStyle(badgeColor)+'>VENDIDO'+(soldOnlyColor?' · '+esc(soldOnlyColor):'')+'</span>':unavailable?'<span class="chip unavailable-chip">AGOTADO</span>':'';
 const detail=sold?'<small class="sold-variant-detail">'+(soldOnlyColor?'<span class="sold-color-dot" style="background:'+selectedSold.hex+'"></span>Color vendido: '+esc(soldOnlyColor):colors.length?'Colores: '+esc(colors.map(c=>c.name).join(', ')):'Prenda vendida')+'</small>':'';
 const availability=sold?'Vendido'+(soldOnlyColor?' · '+esc(soldOnlyColor):''):unavailable?'Sin unidades':'Disponibles: '+availableCount(p)+' unidades';
 return '<article class="product'+(sold?' sold-product':'')+'"><div class="product-photo"><a class="product-photo-link" href="producto.html?id='+encodeURIComponent(p.id)+'"><img loading="lazy" src="'+esc(imageUrl(p.image_url))+'" alt="'+esc(p.name)+'" onerror="this.onerror=null;this.src=\\'images/placeholder.svg\\'"></a>'+badge+'</div><div class="product-details"><div class="product-title-wrap"><h3><a href="producto.html?id='+encodeURIComponent(p.id)+'">'+esc(p.name)+'</a></h3><small>Talla: '+esc(p.size)+'</small>'+detail+'</div><div class="product-price-block"><strong class="product-price">'+money(p.price)+'</strong><span class="product-stock">'+availability+'</span></div></div>'+(sold?'<div class="product-color-choices product-color-empty" aria-hidden="true"></div>':productColorUI(p))+'<button class="product-add" data-add="'+p.id+'" '+(sold||unavailable?'disabled':'')+'>'+(sold?'Vendido':unavailable?'Agotado':'Agregar a mi carrito +')+'</button></article>';
}
function renderFilters(){const list=['<button class="filter '+(filter==='all'?'active':'')+'" data-filter="all">Todas</button>',...cats.map(c=>'<button class="filter '+(filter===c.id?'active':'')+'" data-filter="'+c.id+'">'+esc(c.name)+'</button>')];$('#filters').innerHTML=list.join('')}
function snapshotKey(p){return [p.id,p.name,p.category_id,p.size,p.price,p.description,p.image_url,p.is_sold,p.is_visible,p.stock,JSON.stringify(p.colors||[]),p.created_at].join('|')}
function structureKey(items){return items.map(snapshotKey).join('||')}
function render(){
 renderFilters();
 const shown=products.filter(p=>!soldOut(p)&&(filter==='all'||p.category_id===filter)&&(p.name+' '+p.size).toLowerCase().includes(search));
 $('#productGrid').innerHTML=shown.map(p=>productCard(p)).join('');
 const sold=products.flatMap(p=>{
  if(soldOut(p))return [{p,color:''}];
  return productColors(p).filter(c=>c.sold).map(c=>({p,color:c.name}));
 });
 $('#soldGrid').innerHTML=sold.map(({p,color})=>productCard(p,color,true)).join('');
 $('#emptyProducts').hidden=shown.length>0;$('#emptySold').hidden=sold.length>0;
 const feat=products.filter(p=>productAvailable(p)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
 if(feat){const photo=imageUrl(feat.image_url);if($('#heroProductImage').getAttribute('src')!==photo)$('#heroProductImage').src=photo;$('#heroProductLink').href='producto.html?id='+feat.id}
 renderCart();
}
// No renderizar de nuevo si el catálogo sigue exactamente igual.
function updateStockSilently(){}
function countsForColor(id,color){return cart.filter(item=>item.id===id&&item.color===color).length}
function renderCart(){const items=grouped();const amount=items.reduce((n,x)=>n+x.qty*Number(x.p.price),0);$('#cartCount').textContent=cart.length;$('#cartTotal').textContent=money(amount);$('#cartItems').innerHTML=items.length?items.map(({p,qty,color})=>{const variants=productColors(p),found=variants.find(x=>x.name===color),tag=found?'<small class="cart-color-tag"><span class="admin-color-dot" style="background:'+found.hex+'"></span>Color: '+esc(color)+'</small>':color?'<small class="cart-color-tag">Color: '+esc(color)+'</small>':'';return '<div class="cart-row"><img src="'+esc(imageUrl(p.image_url))+'" alt=""><div><h4>'+esc(p.name)+'</h4><p>Talla: '+esc(p.size)+'</p>'+tag+'<strong>'+money(Number(p.price)*qty)+'</strong><div class="quantity-picker"><button data-minus="'+p.id+'" data-item-color="'+esc(color)+'" aria-label="Restar unidad">−</button><span>'+qty+'</span><button data-plus="'+p.id+'" data-item-color="'+esc(color)+'" '+(countsForColor(p.id,color)>=(found?(colorAvailable(found)?found.stock:0):p.stock)?'disabled':'')+' aria-label="Sumar unidad">+</button></div><small class="cart-stock">Disponibles: '+p.stock+' unidades</small><button class="remove" data-remove="'+p.id+'" data-item-color="'+esc(color)+'">Quitar producto</button></div></div>'}).join(''):'<p class="empty">Tu carrito está vacío.</p>';$('#checkoutBtn').disabled=!items.length||busy||items.some(({p,color,qty})=>{const variants=productColors(p),variant=variants.find(v=>v.name===color);return !productAvailable(p)||(variants.length>0&&(!variant||!colorAvailable(variant)||qty>variant.stock))||(variants.length===0&&qty>p.stock)})}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(window.mjToast);window.mjToast=setTimeout(()=>el.classList.remove('show'),3300)}
let lastStructure='',lastCategories='';
async function refresh(){try{const [p,c]=await Promise.all([getCatalog(),getCategories()]);const nextStructure=structureKey(p),nextCategories=JSON.stringify(c.map(x=>[x.id,x.name,x.sort_order]));const layoutChanged=!loaded||nextStructure!==lastStructure||nextCategories!==lastCategories;products=p;cats=c;lastStructure=nextStructure;lastCategories=nextCategories;loaded=true;if(layoutChanged)render();else updateStockSilently()}catch(e){console.error(e);if(!loaded){$('#emptyProducts').hidden=false;$('#emptyProducts').textContent='La tienda aún no está configurada en Supabase. Intenta nuevamente luego.'}}}
function setCart(next){cart=next;save();renderCart();return true}
$('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;render()});
$('#searchInput').addEventListener('input',e=>{search=e.target.value.toLowerCase().trim();render()});
$('#searchBtn').addEventListener('click',()=>{location.hash='coleccion';$('#searchInput').focus()});
$('#cartBtn').addEventListener('click',()=>{$('#cartDrawer').classList.add('open');$('#cartDrawer').setAttribute('aria-hidden','false');$('#overlay').hidden=false;document.body.classList.add('locked')});
function closeCart(){$('#cartDrawer').classList.remove('open');$('#cartDrawer').setAttribute('aria-hidden','true');$('#overlay').hidden=true;document.body.classList.remove('locked')}
$('#closeCart').addEventListener('click',closeCart);$('#overlay').addEventListener('click',closeCart);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart()});
document.addEventListener('click',e=>{const swatch=e.target.closest('.product-color-choices [data-color]');if(swatch){const box=swatch.closest('[data-color-parent]'),id=box.dataset.colorParent;selectedColors.set(id,swatch.dataset.color);box.querySelectorAll('[data-color]').forEach(el=>{el.classList.toggle('is-selected',el===swatch);el.setAttribute('aria-pressed',String(el===swatch))});box.querySelector('.color-selected-name').textContent=swatch.dataset.color;return}const add=e.target.closest('[data-add],[data-plus]'),minus=e.target.closest('[data-minus]'),rm=e.target.closest('[data-remove]');if(add){const id=add.dataset.add||add.dataset.plus,p=products.find(x=>x.id===id);if(!p||soldOut(p)){toast('Esta prenda ya se vendió');return}const chosen=add.hasAttribute('data-plus')?(add.dataset.itemColor||''):pickedColor(p);const variant=productColors(p).find(c=>c.name===chosen),max=variant?(colorAvailable(variant)?variant.stock:0):p.stock;if(!max||countsForColor(id,chosen)>=max){toast('El color seleccionado está vendido o agotado');return}setCart([...cart,{id,color:chosen}]);toast('Unidad agregada a tu carrito')}else if(minus){const index=cart.findIndex(x=>x.id===minus.dataset.minus&&x.color===(minus.dataset.itemColor||''));if(index!==-1){const next=cart.slice();next.splice(index,1);setCart(next)}}else if(rm){setCart(cart.filter(x=>!(x.id===rm.dataset.remove&&x.color===(rm.dataset.itemColor||''))))}});
$('#checkoutBtn').addEventListener('click',()=>{const group=grouped();if(!group.length)return;if(group.some(({p,color,qty})=>{const variants=productColors(p),variant=variants.find(c=>c.name===color);return !productAvailable(p)||(variants.length>0&&(!variant||!colorAvailable(variant)||qty>variant.stock))||(variants.length===0&&qty>p.stock)})){toast('Hay colores vendidos o sin unidades en tu carrito. Ajusta el pedido.');return}const lines=group.map(({p,qty,color},i)=>{const page=new URL('producto.html?id='+p.id,location.href).href,photo=imageUrl(p.image_url);return(i+1)+'. '+p.name+'\nColor: '+(color||'Sin especificar')+' | Talla: '+p.size+'\nCantidad: '+qty+' | Subtotal: '+money(p.price*qty)+'\nVer producto: '+page+(photo.startsWith('http')?'\nImagen: '+photo:'')});const msg='Hola M&J Shop, quiero realizar este pedido:\n\n'+lines.join('\n\n')+'\n\nTotal estimado: '+money(group.reduce((n,x)=>n+x.p.price*x.qty,0))+'\nPor favor confirma la disponibilidad de los colores y las prendas.';window.open('https://wa.me/593962649242?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer')});
$('#year').textContent=new Date().getFullYear();$('#weekLabel').textContent='Edición '+new Intl.DateTimeFormat('es-EC',{month:'long',year:'numeric'}).format(new Date());
await refresh();setInterval(()=>{if(!busy)refresh()},8000);
const mascot=$('#mascot');let drag=false,moved=false,offX=0,offY=0;mascot.addEventListener('pointerdown',e=>{drag=true;moved=false;const r=mascot.getBoundingClientRect();offX=e.clientX-r.left;offY=e.clientY-r.top;mascot.setPointerCapture(e.pointerId)});mascot.addEventListener('pointermove',e=>{if(!drag)return;moved=true;mascot.style.left=Math.max(0,Math.min(innerWidth-mascot.offsetWidth,e.clientX-offX))+'px';mascot.style.top=Math.max(0,Math.min(innerHeight-mascot.offsetHeight,e.clientY-offY))+'px';mascot.style.bottom='auto'});mascot.addEventListener('pointerup',()=>{drag=false;if(!moved){const r=mascot.getBoundingClientRect();for(let i=0;i<8;i++){const h=document.createElement('span');h.className='floating-heart';h.textContent='♡';h.style.left=r.left+r.width/2+'px';h.style.top=r.top+'px';h.style.setProperty('--drift',((Math.random()-.5)*110)+'px');document.body.appendChild(h);setTimeout(()=>h.remove(),1800)}}});
