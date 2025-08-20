/* =========================
   Menú + Carrito + Checkout WhatsApp
   ========================= */

const MENU_URL  = 'https://rourbina.github.io/chef-francis-data/menu.json';
const DATA_BASE = 'https://rourbina.github.io/chef-francis-data/';

const contenedor  = document.getElementById('listaMenu');
const toggleUSD   = document.getElementById('toggleUSD');
const fxSpan      = document.getElementById('fx');
const PHONE       = '50671135426'; // número de recepción

let tasa = null;      // 1 CRC → USD
let MENU_ITEMS = [];
let usarUSD = false;

let CART = JSON.parse(localStorage.getItem('cart_cf') || '[]'); // [{id, nombre, precio_unit_crc, qty, img, promoTexto?}]
function saveCart(){ localStorage.setItem('cart_cf', JSON.stringify(CART)); }
function cartCount(){ return CART.reduce((a,i)=>a+i.qty,0); }
function cartTotalCRC(){ return CART.reduce((a,i)=>a + i.precio_unit_crc * i.qty, 0); }

/* ====== Promos ====== */
function precioConPromoCRC(item){
  const base = Number(item.precio_crc) || 0;
  const p = item.promo;
  if (!p) return base;

  const tipo = String(p.tipo || '').toLowerCase();
  const valor = Number(p.valor || p.monto || 0);

  if (tipo === 'porcentaje') return Math.max(0, Math.round(base * (1 - valor / 100)));

  // Acepta alias para rebaja fija: 'monto', 'rebaja', 'fijo', 'cantidad'
  if (['monto', 'rebaja', 'fijo', 'cantidad'].includes(tipo)) {
    return Math.max(0, base - valor);
  }

  // '2x1' no cambia el precio unitario aquí
  return base;
}

function badgePromoHTML(item){
  const p = item.promo;
  if (!p) return '';

  const tipo = String(p.tipo || '').toLowerCase();
  const valor = Number(p.valor || p.monto || 0);

  if (tipo === 'porcentaje') return `<span class="badge bg-danger ms-2">-${valor}%</span>`;

  // Alias para rebaja fija
  if (['monto', 'rebaja', 'fijo', 'cantidad'].includes(tipo)) {
    return `<span class="badge bg-danger ms-2">-₡${valor.toLocaleString('es-CR')}</span>`;
  }

  if (tipo === '2x1') return `<span class="badge bg-warning text-dark ms-2">2x1</span>`;

  return '';
}

/* ====== Tasa USD ====== */
// ---- Util: timeout para fetch ----
function fetchWithTimeout(url, ms = 6000) {
  return Promise.race([
    fetch(url),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
  ]);
}

/* =========================
   Tasa USD (cacheada 24h, con múltiples proveedores)
   ========================= */
async function obtenerTasaCRCUSD(){
  // 1) probar cache (24h)
  try {
    const cache = JSON.parse(localStorage.getItem('tasa_crc_usd') || 'null');
    if (cache && (Date.now() - cache.ts) < 24*60*60*1000 && typeof cache.tasa === 'number') {
      return cache.tasa;
    }
  } catch {}

  // 2) proveedores (en orden). La tasa que usamos es: USD por 1 CRC
  const proveedores = [
    // exchangerate.host (CRC base → USD)
    async () => {
      const r = await fetchWithTimeout('https://api.exchangerate.host/latest?base=CRC&symbols=USD', 6000);
      const d = await r.json();
      return d?.rates?.USD;
    },
    // open.er-api.com (CRC base)
    async () => {
      const r = await fetchWithTimeout('https://open.er-api.com/v6/latest/CRC', 6000);
      const d = await r.json();
      return d?.rates?.USD;
    },
    // frankfurter.app: usamos USD base y luego invertimos para obtener 1 CRC en USD
    async () => {
      const r = await fetchWithTimeout('https://api.frankfurter.app/latest?from=USD&to=CRC', 6000);
      const d = await r.json();
      const crcPorUsd = d?.rates?.CRC; // cuántos CRC vale 1 USD
      return (typeof crcPorUsd === 'number' && crcPorUsd > 0) ? (1 / crcPorUsd) : null;
    }
  ];

  for (const fn of proveedores) {
    try {
      const t = await fn();
      if (typeof t === 'number' && t > 0) {
        localStorage.setItem('tasa_crc_usd', JSON.stringify({tasa: t, ts: Date.now()}));
        return t;
      }
    } catch {}
  }

  // 3) último recurso: tasa local de respaldo (aprox.) para no romper UX en móvil
  // 1 USD ≈ ₡540  => 1 CRC ≈ 1/540 USD ≈ 0.00185
  const fallback = 1/540;
  localStorage.setItem('tasa_crc_usd', JSON.stringify({tasa: fallback, ts: Date.now()}));
  return fallback;
}

function actualizarTextoTasa(){
  if (!fxSpan) return;
  if (typeof tasa === 'number' && tasa > 0) {
    const crcPorUsd = Math.round(1 / tasa);
    fxSpan.textContent = `1 USD ≈ ₡${crcPorUsd.toLocaleString('es-CR')}`;
  } else {
    fxSpan.textContent = '—';
  }
}

/* ====== Render del catálogo ====== */
function renderMenu(items){
  if (!contenedor) return;
  contenedor.innerHTML = '';
  items.forEach(s => {
    const precioBase = Number(s.precio_crc) || 0;
    const precioFin  = precioConPromoCRC(s);

    const precioCRC = (precioFin !== precioBase)
      ? `<span class="text-decoration-line-through text-light-200 me-2">₡${precioBase.toLocaleString('es-CR')}</span>
         <span class="badge text-bg-dark border border-warning">₡${precioFin.toLocaleString('es-CR')}</span>`
      : `<span class="badge text-bg-dark border border-warning">₡${precioBase.toLocaleString('es-CR')}</span>`;

    const precioUSD = (usarUSD && tasa)
      ? ` <small class="ms-2">≈ ${(precioFin * tasa).toFixed(2)} USD</small>`
      : '';

    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-xl-4';

    const raw = (s.img || '').trim();
    const imgURL = raw.startsWith('http') ? raw : DATA_BASE + raw.replace(/^\.\//, '');

    col.innerHTML = `
      <div class="card h-100 bg-black text-light border-warning">
        <img class="card-img-top" src="${imgURL}" alt="${s.nombre}"
             loading="lazy" width="600" height="400"
             onerror="this.onerror=null; this.src='${DATA_BASE}assets/img/galeria/placeholder.jpg';" />
        <div class="card-body d-grid gap-2">
          <h3 class="h5 text-warning m-0">${s.nombre} ${badgePromoHTML(s)}</h3>
          <p class="small m-0">${s.desc || ''}</p>
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <span>${precioCRC}${precioUSD}</span>
            <button class="btn btn-sm btn-warning text-dark add-to-cart" data-id="${s.id}">
              <i class="bi bi-cart-plus"></i> Agregar
            </button>
          </div>
        </div>
      </div>`;
    contenedor.appendChild(col);
  });

  // eventos Agregar
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const item = MENU_ITEMS.find(i => String(i.id) === String(id));
      if (item) addToCart(item);
    });
  });
}

/* ====== Carrito ====== */
function addToCart(item){
  const ex = CART.find(i => i.id === item.id);
  if (ex) ex.qty += 1;
  else CART.push({ id:item.id, nombre:item.nombre, precio_unit_crc:Number(item.precio_crc)||0, qty:1, img:item.img||'', promoTexto:item?.promo?.texto||'' });
  saveCart(); updateCartUI();
}
function changeQty(id, delta){
  const it = CART.find(i => i.id === id);
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) CART = CART.filter(i => i.id !== id);
  saveCart(); updateCartUI();
}
function removeItem(id){
  CART = CART.filter(i => i.id !== id);
  saveCart(); updateCartUI();
}
function updateCartUI(){
  const list = document.getElementById('cartList');
  const totalSpan = document.getElementById('cartTotal');
  const countBadge = document.getElementById('cartCount');
  const btnWA = document.getElementById('btnWhatsApp');

  if (list){
    list.innerHTML = '';
    CART.forEach(it => {
      const li = document.createElement('li');
      li.className = 'list-group-item bg-black text-light d-flex justify-content-between align-items-center';
      li.innerHTML = `
        <div class="me-2">
          <div class="fw-bold">${it.nombre}</div>
          <small>₡${it.precio_unit_crc.toLocaleString('es-CR')}</small>
          ${it.promoTexto ? `<div><small class="text-warning">${it.promoTexto}</small></div>` : ''}
        </div>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-warning" onclick="changeQty(${it.id}, -1)">-</button>
          <span class="btn btn-outline-light disabled">${it.qty}</span>
          <button class="btn btn-outline-warning" onclick="changeQty(${it.id}, 1)">+</button>
          <button class="btn btn-outline-danger" onclick="removeItem(${it.id})">&times;</button>
        </div>`;
      list.appendChild(li);
    });
  }

  const totalCRC = cartTotalCRC();
  if (totalSpan)  totalSpan.textContent = `₡${totalCRC.toLocaleString('es-CR')}`;
  if (countBadge) countBadge.textContent = String(cartCount());
  if (btnWA)      btnWA.disabled = CART.length === 0;
}

/* ====== Checkout por WhatsApp ====== */
function buildWhatsAppText(nombre, tel, fecha, notas){
  const items = CART.map(i => `• ${i.qty} × ${i.nombre} — ₡${(i.precio_unit_crc*i.qty).toLocaleString('es-CR')}`).join('\n');
  const total = `₡${cartTotalCRC().toLocaleString('es-CR')}`;
  return `Hola, soy ${nombre}.
Quiero hacer este pedido:
${items}
Total: ${total}
${fecha ? 'Fecha/hora: ' + fecha + '\n' : ''}Tel: ${tel}
${notas ? 'Notas: ' + notas : ''}`;
}

(function bindCheckout(){
  const form = document.getElementById('checkoutForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()){
      form.classList.add('was-validated');
      return;
    }
    const nombre = document.getElementById('cliNombre')?.value?.trim() || '';
    const tel    = document.getElementById('cliTel')?.value?.trim() || '';
    const fecha  = document.getElementById('cliFecha')?.value || '';
    const notas  = document.getElementById('cliNotas')?.value?.trim() || '';

    const texto = buildWhatsAppText(nombre, tel, fecha, notas);
    window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  });
})();

/* ====== Init ====== */
(async function init(){
  try { const r = await fetch(MENU_URL); MENU_ITEMS = await r.json(); }
  catch(e){ console.error('No se pudo cargar menu.json', e); MENU_ITEMS = []; }

  renderMenu(MENU_ITEMS);
  updateCartUI();

  toggleUSD?.addEventListener('change', async (e) => {
    usarUSD = !!e.target.checked;

    if (usarUSD){
      fxSpan && (fxSpan.textContent = 'Cargando tasa…');
      try {
        if (!tasa) tasa = await obtenerTasaCRCUSD();
        actualizarTextoTasa();
      } catch {
        // Si algo falla, ya se guardó un fallback en obtenerTasaCRCUSD()
        actualizarTextoTasa();
      }
    } else {
      // Al apagar USD, limpiamos el texto
      fxSpan && (fxSpan.textContent = '');
    }

    renderMenu(MENU_ITEMS);
    updateCartUI();
  });
})();
