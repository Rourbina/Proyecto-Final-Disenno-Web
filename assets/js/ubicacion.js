// assets/js/ubicacion.js
let map, directionsService, directionsRenderer, destinoMarker;


// Coordenadas exactas del local (Tambor, Alajuela)
const DESTINO = { lat: 10.041136, lng: -84.238641 };


function initMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  // Mapa centrado en el local
  map = new google.maps.Map(mapEl, {
    center: DESTINO,
    zoom: 15,
    mapTypeControl: true,
    streetViewControl: true,
  });

  // Marcador del local
  destinoMarker = new google.maps.Marker({
    position: DESTINO,
    map,
    title: "Chef Francis (Tambor, Alajuela)",
  });

  // Servicios para rutas
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map });

  // Botón: usar geolocalización y trazar ruta
  document.getElementById("btnGeo")?.addEventListener("click", trazarRutaDesdeMiUbicacion);
}

function trazarRutaDesdeMiUbicacion() {
  if (!navigator.geolocation) {
    alert("Tu navegador no soporta geolocalización.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const origen = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const acc = pos.coords.accuracy; // en metros, menor = mejor

      const coords = document.getElementById("coords");
      if (coords) {
        coords.textContent = `Lat: ${origen.lat.toFixed(5)}, Lng: ${origen.lng.toFixed(5)} (±${Math.round(acc)} m)`;
      }

      const req = {
        origin: origen,
        destination: DESTINO,
        travelMode: google.maps.TravelMode.DRIVING,
      };

      directionsService.route(req, (result, status) => {
        if (status === "OK") {
          directionsRenderer.setDirections(result);
          const bounds = new google.maps.LatLngBounds();
          result.routes[0].overview_path.forEach(p => bounds.extend(p));
          map.fitBounds(bounds);
        } else {
          alert("No se pudo calcular la ruta: " + status);
        }
      });
    },
    (err) => {
      let msg = "No se pudo obtener tu ubicación.";
      if (err.code === err.PERMISSION_DENIED) msg = "Debes permitir el acceso a tu ubicación.";
      if (err.code === err.POSITION_UNAVAILABLE) msg = "Ubicación no disponible. Verifica GPS/Internet.";
      if (err.code === err.TIMEOUT) msg = "Tiempo de espera agotado. Intenta de nuevo cerca de una ventana.";
      alert(msg);
    },
    {
      enableHighAccuracy: true, // pide GPS/triangulación más fina
      timeout: 15000,           // espera hasta 15s
      maximumAge: 0             // no uses caché
    }
  );
}


// Exponer la función para el callback de Google
window.initMap = initMap;
