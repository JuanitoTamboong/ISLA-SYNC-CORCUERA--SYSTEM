// ============ CONFIGURATION ============
const SIMARA_COORDS = { lat: 12.8055, lon: 122.0474 };
const GEOAPIFY_API_KEY = '9a11bf7a766c45e29baf9f8eb1104500';

let map;
let routeControl = null;
let userMarker = null;
let destinationMarker = null;
let userLocation = null;
let destinationCoords = null;
let destinationTitle = 'San Jose, Corcuera';
let isRouting = false;

const MAP_TILES = {
    voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    positron: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
};

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', function() {
    // Get destination from URL params
    const params = new URLSearchParams(window.location.search);
    const destLat = parseFloat(params.get('destLat')) || SIMARA_COORDS.lat;
    const destLng = parseFloat(params.get('destLng')) || SIMARA_COORDS.lon;
    const title = decodeURIComponent(params.get('title') || 'San Jose, Corcuera');
    const startLat = parseFloat(params.get('startLat')) || SIMARA_COORDS.lat;
    const startLng = parseFloat(params.get('startLng')) || SIMARA_COORDS.lon;

    destinationTitle = title;
    destinationCoords = { lat: destLat, lon: destLng };
    userLocation = { lat: startLat, lon: startLng };

    // Update UI
    document.querySelector('.title').textContent = `Directions to ${title}`;
    document.getElementById('locationTitle').textContent = title;
    document.getElementById('locationAddress').textContent = 'Simara Island, Corcuera, Romblon';

    // Initialize map
    const initMapDelayed = function() {
        if (typeof L === 'undefined') {
            setTimeout(initMapDelayed, 100);
            return;
        }
        createMap(startLat, startLng, destLat, destLng, title);
    };
    initMapDelayed();

    // Setup event listeners
    setupEventListeners(title);

    // Get user's real location if available
    getUserLocation();
});

// ============ MAP CREATION ============
function createMap(startLat, startLng, destLat, destLng, title) {
    if (map) map.remove();
    
    map = L.map('map', {
        zoomControl: true,
        fadeAnimation: true,
        zoomAnimation: true
    }).setView([startLat, startLng], 14);
    
    L.tileLayer(MAP_TILES.voyager, {
        attribution: '© OSM © CARTO',
        maxZoom: 19
    }).addTo(map);

    // Add scale control
    L.control.scale({ metric: true, position: 'bottomleft' }).addTo(map);

    // Add zoom control
    map.zoomControl.setPosition('bottomright');

    // Add user marker (green pin)
    addUserMarker(startLat, startLng);

    // Add destination marker (red pin)
    addDestinationMarker(destLat, destLng, title);

    // Fit bounds to show both points
    map.fitBounds([[startLat, startLng], [destLat, destLng]], { padding: [50, 50] });

    // Handle map click for manual location selection
    map.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        updateDestination(lat, lng, 'Selected Location');
    });
}

// ============ MARKERS - Using Pin Design (NO POPUPS) ============
function addUserMarker(lat, lng) {
    if (userMarker) map.removeLayer(userMarker);
    
    const userIcon = L.divIcon({
        html: `<div style="position: relative; width: 40px; height: 40px;">
            <div style="
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #10b981, #059669);
                border-radius: 50%;
                box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
                border: 3px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2;
            ">
                <div style="
                    width: 12px;
                    height: 12px;
                    background: white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                "></div>
            </div>
            <div style="
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 12px solid #059669;
                z-index: 1;
            "></div>
            <div style="
                position: absolute;
                top: -28px;
                left: 50%;
                transform: translateX(-50%);
                background: #1e293b;
                color: white;
                padding: 2px 8px;
                border-radius: 8px;
                font-size: 9px;
                white-space: nowrap;
                font-family: 'Poppins', sans-serif;
                z-index: 3;
            ">📍 You</div>
        </div>`,
        iconSize: [40, 50],
        iconAnchor: [20, 50],
        className: 'user-marker'
    });
    
    userMarker = L.marker([lat, lng], { icon: userIcon })
        .addTo(map);
}

function addDestinationMarker(lat, lng, title) {
    if (destinationMarker) map.removeLayer(destinationMarker);
    
    const destIcon = L.divIcon({
        html: `<div style="position: relative; width: 40px; height: 40px;">
            <div style="
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                border-radius: 50%;
                box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
                border: 3px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2;
            ">
                <div style="
                    width: 12px;
                    height: 12px;
                    background: white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                "></div>
            </div>
            <div style="
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 12px solid #dc2626;
                z-index: 1;
            "></div>
            <div style="
                position: absolute;
                top: -28px;
                left: 50%;
                transform: translateX(-50%);
                background: #1e293b;
                color: white;
                padding: 2px 8px;
                border-radius: 8px;
                font-size: 9px;
                white-space: nowrap;
                max-width: 120px;
                overflow: hidden;
                text-overflow: ellipsis;
                font-family: 'Poppins', sans-serif;
                z-index: 3;
            ">🏁 ${title}</div>
        </div>`,
        iconSize: [40, 50],
        iconAnchor: [20, 50],
        className: 'destination-marker'
    });
    
    destinationMarker = L.marker([lat, lng], { icon: destIcon })
        .addTo(map);
}

// ============ ROUTING ============
function calculateRoute(startLat, startLng, endLat, endLng, title) {
    if (isRouting) return;
    isRouting = true;
    
    if (routeControl) {
        map.removeControl(routeControl);
        routeControl = null;
    }

    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="btn-loader"></span> Calculating Route...';

    try {
        routeControl = L.Routing.control({
            waypoints: [
                L.latLng(startLat, startLng),
                L.latLng(endLat, endLng)
            ],
            routeWhileDragging: false,
            showAlternatives: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            show: false,
            lineOptions: {
                styles: [
                    { 
                        color: '#2563eb', 
                        weight: 5, 
                        opacity: 0.9,
                        lineCap: 'round',
                        lineJoin: 'round'
                    }
                ],
                addWaypoints: false
            },
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'driving'
            }),
            createMarker: function() {
                return null;
            }
        }).addTo(map);

        routeControl.on('routesfound', function(e) {
            const route = e.routes[0];
            const distance = (route.summary.totalDistance / 1000).toFixed(1);
            const time = Math.round(route.summary.totalTime / 60);
            
            showRouteSummary(title, distance, time);
            
            // REMOVED the check marks - now just shows "Route Found"
            confirmBtn.innerHTML = 'Route Found ✓';
            confirmBtn.className = 'confirm-btn success';
            confirmBtn.disabled = false;
            
            isRouting = false;
        });

        routeControl.on('routingerror', function(e) {
            console.error('Routing error:', e);
            showNoRouteError();
        });

    } catch (error) {
        console.error('Route error:', error);
        showNoRouteError();
    }
}

// ============ ROUTE SUMMARY ============
function showRouteSummary(title, distance, time) {
    const existingSummary = document.querySelector('.route-summary');
    if (existingSummary) existingSummary.remove();

    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'route-summary';
    summaryDiv.innerHTML = `
        <div class="route-info">
            <strong>${title}</strong>
            <div class="route-details">
                <i class="fa fa-road"></i> ${distance} km &nbsp;|&nbsp;
                <i class="fa fa-clock"></i> ${time} min
            </div>
        </div>
        <button class="route-close" onclick="clearRoute()">✕ Close</button>
    `;
    
    const mapContainer = document.querySelector('.map');
    if (mapContainer) {
        mapContainer.appendChild(summaryDiv);
    }
}

function showNoRouteError() {
    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.innerHTML = 'No Route Found';
    confirmBtn.className = 'confirm-btn error';
    confirmBtn.disabled = false;
    isRouting = false;
    
    setTimeout(function() {
        confirmBtn.innerHTML = 'Confirm Location';
        confirmBtn.className = 'confirm-btn';
    }, 3000);
}

window.clearRoute = function() {
    if (routeControl) {
        map.removeControl(routeControl);
        routeControl = null;
    }
    const summary = document.querySelector('.route-summary');
    if (summary) summary.remove();
    
    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.innerHTML = 'Confirm Location';
    confirmBtn.className = 'confirm-btn';
};

// ============ LOCATION MANAGEMENT ============
function updateDestination(lat, lng, title) {
    destinationCoords = { lat: lat, lon: lng };
    destinationTitle = title || 'Selected Location';
    
    document.getElementById('locationTitle').textContent = title || 'Selected Location';
    document.getElementById('locationAddress').textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    
    addDestinationMarker(lat, lng, title || 'Selected Location');
    clearRoute();
}

function reverseGeocode(lat, lng, callback) {
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${GEOAPIFY_API_KEY}&format=json`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.results && data.results[0]) {
                const result = data.results[0];
                const name = result.name || result.street || result.city || result.country || 'Unknown Location';
                callback(name);
            } else {
                callback('Unknown Location');
            }
        })
        .catch(function() {
            callback('Unknown Location');
        });
}

function searchLocation(query) {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_API_KEY}&format=json&limit=5`;
    
    return fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                return data.results.map(function(result) {
                    return {
                        name: result.name || result.street || result.city || 'Unknown',
                        address: result.formatted || result.address_line1 || '',
                        lat: result.lat,
                        lon: result.lon
                    };
                });
            }
            return [];
        })
        .catch(function() {
            return [];
        });
}

// ============ EVENT LISTENERS ============
function setupEventListeners(title) {
    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.addEventListener('click', function() {
        if (destinationCoords && userLocation) {
            calculateRoute(
                userLocation.lat, 
                userLocation.lon, 
                destinationCoords.lat, 
                destinationCoords.lon, 
                destinationTitle
            );
        } else {
            alert('Please wait for your location to be detected.');
        }
    });

    const gpsBtn = document.getElementById('gpsBtn');
    gpsBtn.addEventListener('click', function() {
        this.classList.add('loading');
        getUserLocation(function() {
            gpsBtn.classList.remove('loading');
        });
    });

    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    let searchResultsContainer = null;

    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        clearTimeout(searchTimeout);
        
        if (searchResultsContainer) {
            searchResultsContainer.remove();
            searchResultsContainer = null;
        }
        
        if (query.length > 2) {
            searchTimeout = setTimeout(function() {
                searchLocation(query).then(function(results) {
                    if (results.length > 0) {
                        showSearchResults(results);
                    }
                });
            }, 500);
        }
    });

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query.length > 0) {
                searchLocation(query).then(function(results) {
                    if (results.length > 0) {
                        const result = results[0];
                        updateDestination(result.lat, result.lon, result.name);
                        map.setView([result.lat, result.lon], 15);
                        if (searchResultsContainer) {
                            searchResultsContainer.remove();
                            searchResultsContainer = null;
                        }
                        searchInput.value = result.name;
                    }
                });
            }
        }
    });

    function showSearchResults(results) {
        if (searchResultsContainer) {
            searchResultsContainer.remove();
        }
        
        searchResultsContainer = document.createElement('div');
        searchResultsContainer.className = 'search-results active';
        searchResultsContainer.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            margin-top: 8px;
            max-height: 300px;
            overflow-y: auto;
            z-index: 2000;
        `;
        
        const searchBox = document.querySelector('.search-box');
        searchBox.style.position = 'relative';
        
        results.forEach(function(result) {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 12px;
                border-bottom: 1px solid #f1f5f9;
                transition: all 0.2s ease;
                font-family: 'Poppins', sans-serif;
            `;
            item.innerHTML = `
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #eef2f6; display: flex; align-items: center; justify-content: center; color: #2563eb; flex-shrink: 0;">
                    <i class="fa fa-location-dot"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; color: #1e293b; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${result.name}</div>
                    <div style="font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${result.address}</div>
                </div>
            `;
            item.onmouseover = function() {
                this.style.background = '#f8fafc';
            };
            item.onmouseout = function() {
                this.style.background = 'white';
            };
            item.onclick = function() {
                updateDestination(result.lat, result.lon, result.name);
                map.setView([result.lat, result.lon], 15);
                searchInput.value = result.name;
                if (searchResultsContainer) {
                    searchResultsContainer.remove();
                    searchResultsContainer = null;
                }
            };
            searchResultsContainer.appendChild(item);
        });
        
        searchBox.appendChild(searchResultsContainer);
        
        setTimeout(function() {
            document.addEventListener('click', function closeResults(e) {
                if (!searchBox.contains(e.target)) {
                    if (searchResultsContainer) {
                        searchResultsContainer.remove();
                        searchResultsContainer = null;
                    }
                    document.removeEventListener('click', closeResults);
                }
            });
        }, 100);
    }
}

// ============ USER LOCATION ============
function getUserLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                userLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                addUserMarker(userLocation.lat, userLocation.lon);
                map.setView([userLocation.lat, userLocation.lon], 15);
                if (callback) callback();
            },
            function(error) {
                console.warn('Geolocation error:', error);
                userLocation = SIMARA_COORDS;
                addUserMarker(SIMARA_COORDS.lat, SIMARA_COORDS.lon);
                map.setView([SIMARA_COORDS.lat, SIMARA_COORDS.lon], 14);
                if (callback) callback();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    } else {
        userLocation = SIMARA_COORDS;
        addUserMarker(SIMARA_COORDS.lat, SIMARA_COORDS.lon);
        map.setView([SIMARA_COORDS.lat, SIMARA_COORDS.lon], 14);
        if (callback) callback();
    }
}

// ============ RESPONSIVE HANDLING ============
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        if (map) map.invalidateSize();
    }, 250);
});