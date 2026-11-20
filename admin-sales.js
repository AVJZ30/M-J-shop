import {supabase,productColors,colorAvailable,productSold,availableCount,money,esc,imageUrl} from './mj-db.js';

// Módulo independiente: se añade al panel existente sin reemplazar sus funciones.
const $=s=>document.querySelector(s);
const form=$('#saleForm'),productInput=$('#saleProduct'),colorInput=$('#saleColor'),colorWrap=$('#saleColorWrap'),qtyInput=$('#saleQty');
const saveBtn=$('#saveSaleBtn'),availability=$('#saleAvailability'),history=$('#salesHistory'),soldList=$('#soldProductsAdmin');
let inventory=[],sending=false,refreshTimer=null;

function warn(message){availability.textContent=message;availability.classList.add('has-warning')}
function normal(message){availability.textContent=message;availability.classList.remove('has-warning')}
function getSelected(){return inventory.find(p=>p.id===productInput.value)}
function saleColor(){return productColors(getSelected()).find(c=>c.name===colorInput.value)}
function isLegacy(colors){return colors.some(c=>!c.tracked)}

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
 else normal('Disponibles: '+available+' unidades · '+money(p.price)+' por unidad · Venta: '+money(qty*Number(p.price)));
}

function renderProductOptions(){
 const previous=productInput.value;
 productInput.innerHTML='<option value="">Selecciona una prenda</option>'+inventory.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' · Talla '+esc(p.size)+(productSold(p)?' · VENDIDO':'')+'</option>').join('');
 if(inventory.some(p=>p.id===previous))productInput.value=previous;
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
  return '<div class="admin-sale-row"><img src="'+esc(imageUrl(p.image_url))+'" alt=""><div><strong>'+esc(p.name)+'</strong><small>Talla: '+esc(p.size)+'</small><span class="sale-status">'+esc(kind)+' · '+label+'</span></div></div>';
 }).join(''):'<p class="sales-help">Todavía no hay prendas marcadas como vendidas.</p>';
}

async function loadProducts(){
 const {data,error}=await supabase.from('mj_products')
  .select('id,name,size,price,stock,colors,is_sold,image_url,created_at')
  .order('created_at',{ascending:false});
 if(error){console.warn('No se pudo cargar prendas para ventas',error);warn('No se pudieron recuperar las prendas. Comprueba tu sesión de administración.');return}
 inventory=data||[];renderProductOptions();
}

async function loadSales(){
 const {data,error}=await supabase.from('mj_sales')
  .select('id,product_name,color_name,color_hex,qty,unit_price,sold_at')
  .order('sold_at',{ascending:false}).limit(80);
 if(error){
  console.warn('Historial de ventas no disponible',error);
  history.innerHTML='<p class="sales-help">Para activar el registro de ventas, ejecuta <a href="https://github.com/AVJZ30/M-J-shop/blob/main/supabase/REGISTRAR_VENTAS.sql" target="_blank" rel="noopener noreferrer">REGISTRAR_VENTAS.sql</a> en Supabase.</p>';
  return;
 }
 history.innerHTML=data?.length?data.map(sale=>{
  const stamp=new Date(sale.sold_at).toLocaleString('es-EC',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Guayaquil'});
  const color=sale.color_name?'<span class="sale-variant"><span class="sale-color-dot" style="background:'+(/^#[0-9A-F]{6}$/i.test(sale.color_hex||'')?sale.color_hex:'#ddd')+'"></span>'+esc(sale.color_name)+'</span>':'Sin color registrado';
  return '<div class="admin-sale-history-row"><div><strong>'+esc(sale.product_name)+'</strong><small>'+color+'</small><small>'+esc(stamp)+'</small></div><div class="sale-history-amount"><strong>'+sale.qty+' '+(sale.qty===1?'unidad':'unidades')+'</strong><small>'+money(Number(sale.unit_price)*sale.qty)+'</small></div></div>';
 }).join(''):'<p class="sales-help">Todavía no hay ventas registradas desde esta sección.</p>';
}

async function loadEverything(){
 const {data:{user},error}=await supabase.auth.getUser();if(error||!user)return;
 const {data:allowed}=await supabase.rpc('mj_is_admin');if(!allowed)return;
 await Promise.all([loadProducts(),loadSales()]);
}

productInput.addEventListener('change',updateSaleColor);
colorInput.addEventListener('change',updateSaleAvailability);
qtyInput.addEventListener('input',updateSaleAvailability);
form.addEventListener('submit',async event=>{
 event.preventDefault();if(sending)return;
 const p=getSelected(),color=colorWrap.hidden?null:colorInput.value,qty=Number(qtyInput.value);
 updateSaleAvailability();if(saveBtn.disabled||!p)return;
 if(!confirm('¿Registrar la venta de '+qty+' '+(qty===1?'unidad':'unidades')+' de '+p.name+(color?' · '+color:'')+'? Se descontará del inventario.'))return;
 sending=true;saveBtn.disabled=true;
 try{
  const {data,error}=await supabase.rpc('mj_register_sale',{p_product_id:p.id,p_color:color,p_qty:qty});
  if(error)throw error;
  await Promise.all([loadProducts(),loadSales()]);
  qtyInput.value='1';updateSaleAvailability();
  window.dispatchEvent(new Event('mj:sale-recorded'));
  normal('Venta registrada correctamente. '+(data?.color_sold?'Ese color pasó a VENDIDO. ':data?.product_sold?'La prenda pasó a VENDIDO. ':'Inventario actualizado. ')+'Las existencias se reflejarán en la tienda.');
 }catch(e){console.error('Error registrando venta',e);warn(e.message||'No fue posible registrar la venta.')}
 finally{sending=false;updateSaleAvailability()}
});

const observer=new MutationObserver(()=>{
 if(refreshTimer)clearTimeout(refreshTimer);
 refreshTimer=setTimeout(()=>{refreshTimer=null;loadProducts()},180);
});
observer.observe($('#adminList'),{childList:true});
supabase.auth.onAuthStateChange((event)=>{
 if(event==='SIGNED_IN')setTimeout(()=>loadEverything(),0);
 if(event==='SIGNED_OUT'){inventory=[];renderProductOptions();history.innerHTML=''}
});
await loadEverything();
