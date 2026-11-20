import {supabase,productColors,colorAvailable,productSold,availableCount,money,esc,imageUrl} from './mj-db.js';

// Módulo independiente: se añade al panel existente sin reemplazar sus funciones.
const $=s=>document.querySelector(s);
const form=$('#saleForm'),productInput=$('#saleProduct'),colorInput=$('#saleColor'),colorWrap=$('#saleColorWrap'),qtyInput=$('#saleQty');
const saveBtn=$('#saveSaleBtn'),availability=$('#saleAvailability'),soldList=$('#soldProductsAdmin');
const productTrigger=$('#saleProductTrigger'),productTriggerText=$('#saleProductTriggerText'),productChoices=$('#saleProductChoices');
let inventory=[],sending=false,refreshTimer=null;

function warn(message){availability.textContent=message;availability.classList.add('has-warning')}
function normal(message){availability.textContent=message;availability.classList.remove('has-warning')}
function getSelected(){return inventory.find(p=>p.id===productInput.value)}
function saleColor(){return productColors(getSelected()).find(c=>c.name===colorInput.value)}
function isLegacy(colors){return colors.some(c=>!c.tracked)}

function pickerImage(p){
 return '<img class="sale-picker-thumb" src="'+esc(imageUrl(p.image_url))+'" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'images/placeholder.svg\'">';
}
function pickerDetails(p){
 const sold=productSold(p),units=availableCount(p);
 return '<span class="sale-picker-copy"><strong>'+esc(p.name)+'</strong><small>Talla: '+esc(p.size)+' · '+money(p.price)+'</small><small class="sale-picker-status">'+(sold?'VENDIDO':units>0?units+' '+(units===1?'unidad disponible':'unidades disponibles'):'AGOTADO')+'</small></span>';
}
function renderProductPicker(){
 const selected=getSelected();
 productTriggerText.innerHTML=selected?pickerImage(selected)+pickerDetails(selected):'<span class="sale-picker-placeholder">Toca aquí para elegir una prenda</span>';
 productChoices.innerHTML=inventory.length?inventory.map(p=>
  '<button type="button" class="sale-product-option" role="option" data-sale-pick="'+esc(p.id)+'" aria-selected="'+(p.id===productInput.value)+'">'+pickerImage(p)+pickerDetails(p)+'</button>'
 ).join(''):'<p class="sales-help" style="margin:10px">Todavía no hay prendas registradas.</p>';
}
function setPickerOpen(open,focusOption=false){
 const expanded=!!open;
 productChoices.hidden=!expanded;
 productTrigger.setAttribute('aria-expanded',String(expanded));
 if(expanded&&focusOption){
  const options=[...productChoices.querySelectorAll('[data-sale-pick]')];
  const focused=options.find(el=>el.dataset.salePick===productInput.value)||options[0];
  focused?.focus();
 }
}
productTrigger.addEventListener('click',()=>setPickerOpen(productChoices.hidden,true));
productTrigger.addEventListener('keydown',e=>{
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setPickerOpen(true,true)}
 if(e.key==='Escape'){setPickerOpen(false)}
});
productChoices.addEventListener('click',e=>{
 const option=e.target.closest('[data-sale-pick]');
 if(!option)return;
 productInput.value=option.dataset.salePick;
 productInput.dispatchEvent(new Event('change',{bubbles:true}));
 setPickerOpen(false);
 productTrigger.focus();
});
productChoices.addEventListener('keydown',e=>{
 const options=[...productChoices.querySelectorAll('[data-sale-pick]')];
 const index=options.indexOf(document.activeElement);
 if(e.key==='Escape'){e.preventDefault();setPickerOpen(false);productTrigger.focus()}
 else if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Home'||e.key==='End'){
  e.preventDefault();
  if(!options.length)return;
  const next=e.key==='Home'?0:e.key==='End'?options.length-1:e.key==='ArrowDown'?(index+1)%options.length:(index<=0?options.length-1:index-1);
  options[next]?.focus();
 }
});
document.addEventListener('pointerdown',e=>{
 if(!e.target.closest('.sale-product-picker'))setPickerOpen(false);
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!productChoices.hidden){setPickerOpen(false);productTrigger.focus()}
});


function updateSaleColor(){
 const p=getSelected(),colors=productColors(p),previous=colorInput.value;
 colorWrap.hidden=!p||!colors.length;
 if(!p){colorInput.innerHTML='';normal('Selecciona una prenda para registrar la venta.');saveBtn.disabled=true;return}
 if(colors.length){
  const available=colors.filter(colorAvailable);
  colorInput.innerHTML='<option value="">Elige un color</option>'+colors.map(c=>'<option value="'+esc(c.name)+'" '+(colorAvailable(c)?'':'disabled')+'>'+esc(c.name)+(c.sold?' · VENDIDO':c.stock===0?' · SIN UNIDADES':' · '+c.stock+' unidades')+'</option>').join('');
  if(available.some(c=>c.name===previous))colorInput.value=previous;
  else if(available.length===1)colorInput.value=available[0].name;
  else colorInput.value='';
 }else colorInput.innerHTML='';
 updateSaleAvailability();
}

function updateSaleAvailability(){
 const p=getSelected();if(!p){saveBtn.disabled=true;normal('Selecciona una prenda para registrar la venta.');return}
 const colors=productColors(p),selected=saleColor(),qty=Number(qtyInput.value);
 let available=colors.length?(selected?.stock||0):Number(p.stock)||0;
 let problem='';
 if(p.is_sold||productSold(p))problem='Esta prenda ya está marcada como vendida.';
 else if(isLegacy(colors))problem='Primero edita esta prenda y distribuye sus unidades entre los colores.';
 else if(colors.length&&!selected)problem='Selecciona uno de los colores que todavía están disponibles.';
 else if(colors.length&&!colorAvailable(selected))problem='El color elegido ya está vendido o agotado.';
 else if(!available)problem='No quedan unidades disponibles.';
 else if(!Number.isInteger(qty)||qty<1)problem='Indica cuántas unidades se vendieron.';
 else if(qty>available)problem='Solo hay '+available+' unidades disponibles para esta selección.';
 saveBtn.disabled=sending||!!problem;
 qtyInput.max=Math.max(1,available);
 if(problem)warn(problem);
 else normal('Disponibles: '+available+' '+(available===1?'unidad':'unidades')+' · '+money(p.price)+' por unidad · Venta: '+money(qty*Number(p.price)));
}

function renderProductOptions(){
 const previous=productInput.value;
 productInput.innerHTML='<option value="">Selecciona una prenda</option>'+inventory.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' · Talla '+esc(p.size)+(productSold(p)?' · VENDIDO':'')+'</option>').join('');
 if(inventory.some(p=>p.id===previous))productInput.value=previous;
 else productInput.value='';
 renderProductPicker();
 setPickerOpen(false);
 updateSaleColor();
 renderSoldInventory();
}

function renderSoldInventory(){
 const rows=inventory.flatMap(p=>{
  const colors=productColors(p);
  if(productSold(p))return [{p,variant:null,kind:'Prenda vendida'}];
  return colors.filter(c=>c.sold).map(c=>({p,variant:c,kind:'Color vendido'}));
 });
 soldList.innerHTML=rows.length?rows.map(({p,variant,kind})=>{
  const label=variant?'<span class="sale-color-dot" style="background:'+variant.hex+'"></span> '+esc(variant.name):'Todos los colores / prenda completa';
  const action=variant
  ?'<button type="button" class="sale-remove-button" data-remove-sold-color="'+esc(variant.name)+'" data-sold-product-id="'+esc(p.id)+'" aria-label="Eliminar color vendido '+esc(variant.name)+' de '+esc(p.name)+'">Eliminar color</button>'
  :'<button type="button" class="sale-remove-button" data-remove-sold-product="'+esc(p.id)+'" aria-label="Eliminar prenda vendida '+esc(p.name)+'">Eliminar prenda</button>';
  return '<div class="admin-sale-row"><img src="'+esc(imageUrl(p.image_url))+'" alt=""><div><strong>'+esc(p.name)+'</strong><small>Talla: '+esc(p.size)+'</small><span class="sale-status">'+esc(kind)+' · '+label+'</span></div>'+action+'</div>';
 }).join(''):'<p class="sales-help">Todavía no hay prendas marcadas como vendidas.</p>';
}

// Solo los productos o colores ya vendidos pueden eliminarse desde esta lista.
// Se confirma la eliminación permanente para evitar borrados accidentales.
let removingSold=false;
async function removeSoldEntry(event){
 const button=event.target.closest('[data-remove-sold-product],[data-remove-sold-color]');
 if(!button||removingSold||button.disabled)return;
 const productId=button.dataset.soldProductId||button.dataset.removeSoldProduct;
 const color=button.dataset.removeSoldColor||null;
 const chosen=inventory.find(p=>p.id===productId);
 if(!chosen)return;
 const message=color
  ?'¿Eliminar definitivamente el color vendido "'+color+'" de "'+chosen.name+'"? Los demás colores permanecerán disponibles.'
  :'¿Eliminar definitivamente la prenda vendida "'+chosen.name+'"? También desaparecerá del catálogo y de Supabase.';
 if(!confirm(message))return;
 removingSold=true;
 button.disabled=true;
 try{
  const {data:isAdmin,error:authError}=await supabase.rpc('mj_is_admin');
  if(authError||!isAdmin)throw Error('Tu sesión no tiene permisos de administración.');
  // Consultar la versión actual evita modificar una prenda editada en otra sesión.
  const {data:latest,error:readError}=await supabase.from('mj_products')
   .select('id,name,colors,is_sold,stock,updated_at,image_url').eq('id',productId).single();
  if(readError||!latest)throw Error('La prenda ya no existe o no se pudo consultar.');
  if(color){
   if(productSold(latest))throw Error('La prenda completa está vendida. Usa Eliminar prenda si deseas borrarla.');
   const options=Array.isArray(latest.colors)?latest.colors:[];
   const soldOption=options.find(c=>c&&c.name===color&&c.sold===true);
   if(!soldOption)throw Error('Ese color ya no está marcado como vendido. Actualiza el panel.');
   const remainingColors=options.filter(c=>c?.name!==color);
   const {data, error}=await supabase.from('mj_products')
    .update({colors:remainingColors,updated_at:new Date().toISOString()})
    .eq('id',latest.id).eq('updated_at',latest.updated_at).select('id');
   if(error)throw error;
   if(!data?.length)throw Error('La prenda cambió mientras la editabas. Actualiza el panel e inténtalo de nuevo.');
  }else{
   if(!productSold(latest))throw Error('Esta prenda ya no está marcada como vendida.');
   const {data,error}=await supabase.from('mj_products').delete()
    .eq('id',latest.id).eq('updated_at',latest.updated_at).select('id');
   if(error)throw error;
   if(!data?.length)throw Error('La prenda cambió mientras la eliminabas. Actualiza el panel e inténtalo de nuevo.');
  }
  await loadProducts();
  window.dispatchEvent(new Event('mj:sale-recorded'));
  const toast=$('#toast');
  toast.textContent=color?'Color vendido eliminado. Los otros colores no se modificaron.':'Prenda vendida eliminada de Supabase y del catálogo.';
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'),4300);
 }catch(e){
  console.error('No se pudo eliminar el vendido',e);
  const toast=$('#toast');
  toast.textContent=e.message||'No se pudo eliminar el elemento vendido.';
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'),4300);
 }finally{
  removingSold=false;
  button.disabled=false;
 }
}
soldList.addEventListener('click',removeSoldEntry);

async function loadProducts(){
 const {data,error}=await supabase.from('mj_products')
  .select('id,name,size,price,stock,colors,is_sold,image_url,created_at')
  .order('created_at',{ascending:false});
 if(error){console.warn('No se pudo cargar prendas para ventas',error);warn('No se pudieron recuperar las prendas. Comprueba tu sesión de administración.');return}
 inventory=data||[];renderProductOptions();
}

async function loadEverything(){
 const {data:{user},error}=await supabase.auth.getUser();if(error||!user)return;
 const {data:allowed}=await supabase.rpc('mj_is_admin');if(!allowed)return;
 await loadProducts();
}

productInput.addEventListener('change',()=>{renderProductPicker();updateSaleColor()});
colorInput.addEventListener('change',updateSaleAvailability);
qtyInput.addEventListener('input',updateSaleAvailability);
form.addEventListener('submit',async event=>{
 event.preventDefault();if(sending)return;
 const p=getSelected(),color=colorWrap.hidden?null:colorInput.value,qty=Number(qtyInput.value);
 updateSaleAvailability();if(saveBtn.disabled||!p)return;
 sending=true;saveBtn.disabled=true;
 try{
  const {data,error}=await supabase.rpc('mj_register_sale',{p_product_id:p.id,p_color:color,p_qty:qty});
  if(error)throw error;
  await loadProducts();
  qtyInput.value='1';updateSaleAvailability();
  window.dispatchEvent(new Event('mj:sale-recorded'));
  const statusText='Venta registrada correctamente. '+(data?.product_sold?'La prenda pasó a VENDIDO. ':data?.color_sold?'Ese color pasó a VENDIDO. ':'Inventario actualizado. ');
  const toast=$('#toast');toast.textContent=statusText;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),4300);
 }catch(e){console.error('Error registrando venta',e);warn(e.code==='PGRST202'||e.code==='42883'?'Primero ejecuta REGISTRAR_VENTAS.sql en Supabase para activar esta función.':(e.message||'No fue posible registrar la venta.'))}
 finally{sending=false;updateSaleAvailability()}
});

const observer=new MutationObserver(()=>{
 if(refreshTimer)clearTimeout(refreshTimer);
 refreshTimer=setTimeout(()=>{refreshTimer=null;loadProducts()},180);
});
observer.observe($('#adminList'),{childList:true});
supabase.auth.onAuthStateChange((event)=>{
 if(event==='SIGNED_IN')setTimeout(()=>loadEverything(),0);
 if(event==='SIGNED_OUT'){inventory=[];renderProductOptions();}
});
await loadEverything();
