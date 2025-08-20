/*************************************************
 * main.js — Script común para todo el sitio
 * - Cada sección se auto-protege: solo corre si
 *   existen los elementos/IDs que usa.
 *************************************************/

/* =================================================
   1) MAPA + RUTAS (solo si existe #map)
   ================================================= */
let map, directionsService, directionsRenderer;

// Sucursal (Tambor, Alajuela)
const sucursal = { lat: 10.041136, lng: -84.238641 };

// Callback para Google Maps (usa &callback=initMap en el <script> del Maps)
function initMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  map = new google.maps.Map(mapEl, {
    center: sucursal,
    zoom: 14,
    mapId: "DEMO_MAP_ID",
  });

  new google.maps.Marker({
    position: sucursal,
    map,
    title: "Chef Francis (Sucursal)",
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);
}

// Calcula la ruta en carro/bicicleta/caminando desde un origen hasta la sucursal
function calcularRuta(origen, modo = "DRIVING") {
  if (!directionsService || !directionsRenderer) return;
  directionsService.route(
    {
      origin: origen,
      destination: sucursal,
      travelMode: modo,
    },
    (result, status) => {
      if (status === "OK") directionsRenderer.setDirections(result);
      else alert("No se pudo calcular la ruta: " + status);
    }
  );
}

// Usa geolocalización del navegador y calcula la ruta
function usarUbicacion() {
  if (!navigator.geolocation) {
    alert("Tu navegador no soporta geolocalización.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      calcularRuta(coords, "DRIVING");
    },
    () => alert("No se pudo obtener tu ubicación 😥"),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

/* Enlaza el botón de geolocalización si existe */
document.addEventListener("DOMContentLoaded", () => {
  const btnGeo = document.getElementById("btnGeo");
  if (btnGeo) btnGeo.addEventListener("click", usarUbicacion);
});


/* =================================================
   2) MODAL RESERVA/COTIZACIÓN → WhatsApp (si #formReserva)
   ================================================= */
(function initReservaCotiza() {
  const form = document.getElementById("formReserva");
  if (!form) return; // en páginas sin el modal, no hace nada

  const PHONE = "50687625662"; // WhatsApp de recepción

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }
    const nombre   = form.querySelector("#resNombre")?.value?.trim() || "";
    const telefono = form.querySelector("#resTelefono")?.value?.trim() || "";
    const fecha    = form.querySelector("#resFecha")?.value?.trim() || "";
    const servicio = form.querySelector("#resServicio")?.value?.trim() || "";
    const mensaje  = form.querySelector("#resMensaje")?.value?.trim() || "";

    const texto = encodeURIComponent(
      `Hola, soy ${nombre}.\nMe interesa reservar/cotizar:\n` +
      `• Servicio: ${servicio}\n` +
      `• Fecha: ${fecha}\n` +
      `• Teléfono: ${telefono}\n` +
      (mensaje ? `• Detalles: ${mensaje}\n` : "")
    );

    window.open(`https://wa.me/${PHONE}?text=${texto}`, "_blank", "noopener");
    form.reset();
    form.classList.remove("was-validated");
  });
})();


/* =================================================
   3) DESTACADO DE LA SEMANA (en index)
   - Rellena la tarjeta y el modal si existen
   ================================================= */
const MENU_URL  = "https://rourbina.github.io/chef-francis-data/menu.json";
const DATA_BASE = "https://rourbina.github.io/chef-francis-data/";

/* Devuelve semana ISO (1..53) */
function getISOWeek(d = new Date()){
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

// Precio con promo para Home (porcentaje/rebaja fija)
function precioConPromo(item){
  if (!item.promo) return item.precio_crc;
  const t = item.promo.tipo, v = Number(item.promo.valor) || 0;
  if (t === 'porcentaje') return Math.max(0, Math.round(item.precio_crc * (1 - v/100)));
  if (t === 'rebaja'    ) return Math.max(0, item.precio_crc - v);
  return item.precio_crc;
}

function tarjetaPromoHTML(item){
  const raw = (item.img || '').trim();
  const imgURL = raw.startsWith('http') ? raw : DATA_BASE + raw.replace(/^\.\//, '');

  const pOri = item.precio_crc;
  const pFin = precioConPromo(item);
  const badge = item.promo?.texto ? `<span class="badge bg-danger ms-2">${item.promo.texto}</span>` : '';
  return `
    <div class="border border-warning rounded p-2 d-flex gap-3 align-items-center">
      <img src="${imgURL}" alt="${item.nombre}" width="80" height="80"
           class="rounded" onerror="this.src='${DATA_BASE}assets/img/galeria/placeholder.jpg'">
      <div class="flex-grow-1">
        <div class="fw-semibold">${item.nombre} ${badge}</div>
        <div class="small text-light-200">${item.desc || ''}</div>
        <div class="mt-1">
          <span class="text-decoration-line-through text-light-200 me-2">₡${pOri.toLocaleString('es-CR')}</span>
          <span class="badge text-bg-dark border border-warning">₡${pFin.toLocaleString('es-CR')}</span>
        </div>
      </div>
      <a href="menu.html" class="btn btn-sm btn-warning text-dark">Ver</a>
    </div>
  `;
}

async function cargarDestacadoSemanal(){
  // Si no hay tarjeta de destacado, no hacemos nada
  const cardImg  = document.getElementById('featured-img');
  const cardTit  = document.getElementById('featured-title');
  const cardDesc = document.getElementById('featured-desc');
  if (!cardImg && !cardTit && !cardDesc) return;

  try {
    const res = await fetch(MENU_URL, { cache: "no-store" });
    const items = await res.json();

    // Selección simple: el primer producto con promo esta semana
    const promos = items.filter(i => i.promo);
    const hoy = new Date();
    const sem = getISOWeek(hoy);
    const idx = sem % (promos.length || 1);
    const destacado = promos[idx] || items[0];

    const raw = (destacado.img || '').trim();
    const imgURL = raw.startsWith('http') ? raw : DATA_BASE + raw.replace(/^\.\//, '');

    if (cardImg)  cardImg.src = imgURL;
    if (cardTit)  cardTit.textContent = destacado.nombre || 'Producto destacado';
    if (cardDesc) cardDesc.textContent = destacado.desc || '';
  } catch (e) {
    console.warn('No se pudo cargar el destacado semanal', e);
  }
}

async function renderPromoHome(){
  const cont = document.getElementById('promoHome');
  if (!cont) return;

  try {
    const res = await fetch(MENU_URL, { cache: 'no-store' });
    const data = await res.json();

    const promos = data.filter(i => i.promo);      // solo items con promo
    if (!promos.length){
      cont.innerHTML = `<div class="text-light-200">No hay promociones activas.</div>`;
      return;
    }

    const top = promos.slice(0, 2);                // muestra 1–2 promociones
    cont.innerHTML = top.map(tarjetaPromoHTML).join('');
  } catch (e) {
    console.warn('No se pudieron cargar las promos del home', e);
    cont.innerHTML = `<div class="text-light-200">No se pudieron cargar las promociones.</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarDestacadoSemanal();
  renderPromoHome();
});
