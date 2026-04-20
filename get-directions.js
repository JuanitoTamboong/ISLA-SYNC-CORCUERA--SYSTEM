// get-directions.js - Fixed version
const SIMARA_COORDS = { lat: 12.8055, lon: 122.0474 };

let map;
let currentRoute = null;
let routeSummary = null;

const MAP_TILES = {
    voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
};

document.addEventListener('DOMContentLoaded', function() {
    // Parse URL params first
    const params = new URLSearchParams(window.location.search);
    const destLat = parseFloat(params.get('destLat')) || SIMARA_COORDS.lat;
    const destLng = parseFloat(params.get('destLng')) || SIMARA_COORDS.lon;
    const title = decodeURIComponent(params.get('title') || 'Destination');
    const startLat = parseFloat(params.get('startLat')) || SIMARA_COORDS.lat;
    const startLng = parseFloat(params.get('startLng')) || SIMARA_COORDS.lon;

    // Update UI
    const titleEl = document.querySelector('.top-bar .title');
    if (titleEl) titleEl.textContent = `Directions to ${title}`;
    const h3El = document.querySelector('.location-section h3');
    if (h3El) h3El.textContent = title;

    // Confirm button - no longer used for clear
    const confirmBtn = document.querySelector('.confirm-btn');
    if (confirmBtn) {
confirmBtn.textContent = 'Confirm Location';
        confirmBtn.disabled = true;
    }

    // Back
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.onclick = () => history.back();

    // GPS
    const gpsBtn = document.querySelector('.gps-btn');
    if (gpsBtn) gpsBtn.onclick = getCurrentLocation;

    // Wait for Leaflet, init map
    const initMapDelayed = () => {
        if (typeof L === 'undefined') {
            setTimeout(initMapDelayed, 100);
            return;
        }
        createMapAndRoute(startLat, startLng, destLat, destLng, title);
    };
    initMapDelayed();
});

function createMapAndRoute(startLat, startLng, destLat, destLng, title) {
    // Map
    map = L.map('map').setView([SIMARA_COORDS.lat, SIMARA_COORDS.lon], 14);
    
    L.tileLayer(MAP_TILES.voyager, {
        attribution: '© OSM © CARTO',
        maxZoom: 19
    }).addTo(map);

    L.control.scale({metric: true}).addTo(map);

    // Route
    if (L.Routing && L.Routing.control) {
        currentRoute = L.Routing.control({
            waypoints: [L.latLng(startLat, startLng), L.latLng(destLat, destLng)],
            show: false,
            addWaypoints: false,
            routeWhileDragging: true,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            createMarker: function() { return null; },
            lineOptions: {
                styles: [{color: '#2f7c84', weight: 6}]
            }
        }).addTo(map);

        currentRoute.on('routesfound', function(e) {
            const route = e.routes[0];
            const distance = (route.summary.totalDistance / 1000).toFixed(1);
            const time = Math.round(route.summary.totalTime / 60);
            addRouteSummary(title, distance + ' km', time + ' min');
        });
    }
}

function addRouteSummary(title, distance, time) {
    const RouteControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function() {
            const div = L.DomUtil.create('div');
            div.innerHTML = `
                <div style="background: rgba(255,255,255,0.95); padding: 12px 16px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); backdrop-filter: blur(10px); min-width: 180px; font-family: Poppins, sans-serif;">
                    <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">${title}</div>
                    <div style="color: #64748b; font-size: 13px;">
                        <i class="fa fa-road" style="margin-right: 4px;"></i>${distance} | 
                        <i class="fa fa-clock" style="margin-right: 4px;"></i>${time}
                    </div>
                </div>
            `;
            return div;
        }
    });
    routeSummary = new RouteControl();
    routeSummary.addTo(map);
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const newStart = [pos.coords.latitude, pos.coords.longitude];
            if (currentRoute) {
                currentRoute.setWaypoints([L.latLng(newStart[0], newStart[1]), currentRoute.getWaypoints()[1]]);
            }
        });
    }
}



