
const SIMARA_COORDS = { lat: 12.8055, lon: 122.0474 };

let map;
let routeLine = null;
let routeSummary = null;
let peopleMarker = null;
let animationInProgress = false;
let routeAnimationInterval = null;

const MAP_TILES = {
    voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
};

document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const destLat = parseFloat(params.get('destLat')) || SIMARA_COORDS.lat;
    const destLng = parseFloat(params.get('destLng')) || SIMARA_COORDS.lon;
    const title = decodeURIComponent(params.get('title') || 'Destination');
    const startLat = parseFloat(params.get('startLat')) || SIMARA_COORDS.lat;
    const startLng = parseFloat(params.get('startLng')) || SIMARA_COORDS.lon;

    // Update UI
    document.querySelector('.top-bar .title').textContent = `Directions to ${title}`;
    document.querySelector('.location-section h3').textContent = title;

    // Confirm button
    const confirmBtn = document.querySelector('.confirm-btn');
    confirmBtn.textContent = 'Draw Route';
    confirmBtn.onclick = () => animateRouteToDestination(startLat, startLng, destLat, destLng, title);

    // Back button
    document.querySelector('.back-btn').onclick = () => history.back();

    // GPS button
    document.querySelector('.gps-btn').onclick = getCurrentLocation;

    // Init map
    const initMapDelayed = () => {
        if (typeof L === 'undefined') {
            setTimeout(initMapDelayed, 100);
            return;
        }
        createMap(startLat, startLng, destLat, destLng, title);
    };
    initMapDelayed();
});

function createMap(startLat, startLng, destLat, destLng, title) {
    // Clear existing layers
    if (map) map.remove();
    
    map = L.map('map').setView([startLat, startLng], 14);
    
    L.tileLayer(MAP_TILES.voyager, {
        attribution: '© OSM © CARTO',
        maxZoom: 19
    }).addTo(map);

    L.control.scale({metric: true}).addTo(map);

    // Start marker (red)
    L.marker([startLat, startLng], {
        icon: L.divIcon({
            className: 'pin',
            html: '<div class="pin"><div class="dot"></div></div>',
            iconSize: [48, 56],
            iconAnchor: [24, 52],
            className: ''
        })
    }).addTo(map).bindPopup('Start');

    // Destination marker (green)
    L.marker([destLat, destLng], {
        icon: L.divIcon({
            className: 'pin green',
            html: '<div class="pin green"><div class="dot"></div></div>',
            iconSize: [48, 56],
            iconAnchor: [24, 52],
            className: ''
        })
    }).addTo(map).bindPopup(title);

    map.fitBounds([[startLat, startLng], [destLat, destLng]], { padding: [50, 50] });
}

function animateRouteToDestination(startLat, startLng, destLat, destLng, title) {
    if (animationInProgress) return;
    
    animationInProgress = true;
    const confirmBtn = document.querySelector('.confirm-btn');
    confirmBtn.textContent = 'Finding Route...';
    confirmBtn.disabled = true;

    // Clear previous markers
    if (peopleMarker) map.removeLayer(peopleMarker);
    if (routeAnimationInterval) clearInterval(routeAnimationInterval);

    // Use multiple OSRM endpoints for reliability
    const routingServices = [
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&alternatives=false&steps=false`,
        `http://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&alternatives=false&steps=false`,
        `https://routing.openstreetmap.de/routed-car/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&alternatives=false`
    ];

    fetchRoute(routingServices, 0, startLat, startLng, destLat, destLng, title);
}

function fetchRoute(services, index, startLat, startLng, destLat, destLng, title) {
    if (index >= services.length) {
        showNoRouteError(title);
        return;
    }

    fetch(services[index])
        .then(response => {
            if (!response.ok) throw new Error('Failed');
            return response.json();
        })
        .then(data => {
            if (data.routes && data.routes[0] && data.routes[0].geometry) {
                const route = data.routes[0];
                const coordinates = decodePolyline(data.routes[0].geometry);
                const distance = (route.distance / 1000).toFixed(1);
                const time = Math.round(route.duration / 60);
                
                animateLine(coordinates, title, distance + ' km', time + ' min');
            } else {
                throw new Error('No route');
            }
        })
        .catch(() => {
            fetchRoute(services, index + 1, startLat, startLng, destLat, destLng, title);
        });
}

function decodePolyline(encoded) {
    const points = [];
    let index = 0, lat = 0, lng = 0;
    
    while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);
        
        shift = result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);
        
        points.push([lat * 1e-5, lng * 1e-5]);
    }
    return points;
}

function animateLine(coordinates, title, distance, time) {
    if (routeLine) map.removeLayer(routeLine);
    
    routeLine = L.polyline(coordinates, { color: '#3b82f6', weight: 6, opacity: 0 }).addTo(map);
    const latlngs = routeLine.getLatLngs();
    
    // REMOVED peopleMarker to avoid lapses/delay - route line only

    let progress = 0;
    routeAnimationInterval = setInterval(() => {
        progress += 0.015; // Slower smooth speed
        
        if (progress >= 1) {
            progress = 1;
            clearInterval(routeAnimationInterval);
            routeAnimationInterval = null;
            
            // Final route style
            routeLine.setStyle({ opacity: 1, weight: 9, color: '#2563eb' });
            
            animationComplete();
            return;
        }
        
        // Update line only
        const lineEnd = Math.floor(progress * latlngs.length);
        routeLine.setLatLngs(latlngs.slice(0, lineEnd + 1));
        routeLine.setStyle({ 
            opacity: Math.min(0.4 + progress * 0.6, 1),
            weight: Math.min(5 + progress * 4, 9)
        });
    }, 15); // 66 FPS smooth
}


function showNoRouteError(title) {
    animationInProgress = false;
    if (routeAnimationInterval) {
        clearInterval(routeAnimationInterval);
        routeAnimationInterval = null;
    }
    if (peopleMarker) {
        map.removeLayer(peopleMarker);
        peopleMarker = null;
    }
    
    const confirmBtn = document.querySelector('.confirm-btn');
    confirmBtn.textContent = 'No Route Found';
    confirmBtn.style.background = 'linear-gradient(to right, #ef4444, #dc2626)';
    
    // Show error summary
    if (routeSummary) map.removeControl(routeSummary);
    // const ErrorControl = L.Control.extend({...});  // REMOVED: Error popup
    // routeSummary = new ErrorControl();
    // routeSummary.addTo(map);
    
    setTimeout(() => {
        confirmBtn.textContent = 'Try Again';
        confirmBtn.style.background = 'linear-gradient(to right, #3b82f6, #2563eb)';
        confirmBtn.disabled = false;
    }, 3000);
}

function addRouteSummary(title, distance, time) {
    if (routeSummary) map.removeControl(routeSummary);
    
    const RouteControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function() {
            const div = L.DomUtil.create('div');
            div.innerHTML = `
                <div style="background: rgba(255,255,255,0.97); padding: 16px 20px; border-radius: 20px; box-shadow: 0 12px 35px rgba(0,0,0,0.15); backdrop-filter: blur(20px); min-width: 200px; border: 2px solid rgba(59,130,246,0.3);">
                    <div style="font-weight: 700; color: #1e293b; margin-bottom: 10px; font-size: 15px;">${title}</div>
                    <div style="color: #2563eb; font-size: 14px; font-weight: 600;">
                        <i class="fa fa-road" style="margin-right: 8px;"></i>${distance} | 
                        <i class="fa fa-clock" style="margin-right: 8px;"></i>${time}
                    </div>
                </div>
            `;
            return div;
        }
    });
    routeSummary = new RouteControl();
    routeSummary.addTo(map);
}

function animationComplete() {
    animationInProgress = false;
    const confirmBtn = document.querySelector('.confirm-btn');
    confirmBtn.textContent = 'Route Complete ✓';
    setTimeout(() => {
        confirmBtn.textContent = 'Draw Again';
        confirmBtn.disabled = false;
    }, 2000);
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const newStart = [pos.coords.latitude, pos.coords.longitude];
            if (routeLine) map.removeLayer(routeLine);
            if (routeSummary) map.removeControl(routeSummary);
            if (peopleMarker) map.removeLayer(peopleMarker);
            if (routeAnimationInterval) {
                clearInterval(routeAnimationInterval);
                routeAnimationInterval = null;
            }
            
            createMap(newStart[0], newStart[1], 
                     parseFloat(new URLSearchParams(window.location.search).get('destLat')) || SIMARA_COORDS.lat,
                     parseFloat(new URLSearchParams(window.location.search).get('destLng')) || SIMARA_COORDS.lon,
                     decodeURIComponent(new URLSearchParams(window.location.search).get('title') || 'Destination'));
        });
    }
}