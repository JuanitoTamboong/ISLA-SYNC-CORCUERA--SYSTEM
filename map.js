// Global navigateTo - for onclick handlers
window.navigateTo = function(page) {
    const navMap = {
        'home': 'resident-homepage.html',
        'notifications': 'notif.html',
        'settings': 'setting.html'
    };
    if (navMap[page]) {
        window.location.href = navMap[page];
    }
};

// ============ GEOAPIFY CONFIGURATION ============
const GEOAPIFY_API_KEY = '9a11bf7a766c45e29baf9f8eb1104500';

// Simara Island, Corcuera, Romblon coordinates
const SIMARA_COORDS = {
    lat: 12.8055,
    lon: 122.0474
};

let map;
let currentMarkers = [];
let currentRoute = null;
let userLocation = null;
let currentCategory = 0;

// REAL places on Simara Island
const REAL_SIMARA_PLACES = {
    discovery: [
        { name: "Simara Island Lighthouse", lat: 12.8092, lon: 122.0512, type: "lighthouse", description: "Historic lighthouse guiding ships through Romblon waters" },
        { name: "Corcuera Municipal Hall", lat: 12.8055, lon: 122.0474, type: "government", description: "Town hall of Corcuera" },
        { name: "St. Vincent Ferrer Church", lat: 12.8060, lon: 122.0480, type: "church", description: "Historic Catholic church in Corcuera" },
        { name: "Simara Island Viewpoint", lat: 12.8100, lon: 122.0520, type: "viewpoint", description: "Panoramic view of the island" }
    ],
    nature: [
        { name: "Busay Falls", lat: 12.8080, lon: 122.0450, type: "waterfall", description: "Beautiful waterfall on Simara Island" },
        { name: "Taclobo Beach", lat: 12.8020, lon: 122.0500, type: "beach", description: "White sand beach with clear waters" },
        { name: "Simara Rock Formation", lat: 12.8110, lon: 122.0530, type: "nature", description: "Unique rock formations along the coast" },
        { name: "Mangrove Forest", lat: 12.8040, lon: 122.0460, type: "nature", description: "Protected mangrove ecosystem" },
        { name: "Hidden Cove Beach", lat: 12.8075, lon: 122.0495, type: "beach", description: "Secluded beach perfect for swimming" }
    ],
    dining: [
        { name: "Simara Seafood Grill", lat: 12.8060, lon: 122.0475, type: "restaurant", description: "Fresh seafood and local cuisine" },
        { name: "Island View Cafe", lat: 12.8050, lon: 122.0480, type: "cafe", description: "Coffee shop with island views" },
        { name: "Corcuera Eatery", lat: 12.8045, lon: 122.0470, type: "restaurant", description: "Local Filipino dishes" },
        { name: "Beachfront Bar & Grill", lat: 12.8030, lon: 122.0490, type: "bar", description: "Beachside dining and drinks" },
        { name: "Taclobo Beach Resort Restaurant", lat: 12.8025, lon: 122.0505, type: "restaurant", description: "Dining with beach view" }
    ],
    resort: [
        { name: "Simara Island Resort", lat: 12.8070, lon: 122.0500, type: "resort", description: "Beachfront resort with cottages" },
        { name: "Corcuera Beach Resort", lat: 12.8025, lon: 122.0495, type: "resort", description: "Family-friendly beach resort" },
        { name: "Island View Lodge", lat: 12.8065, lon: 122.0485, type: "hotel", description: "Affordable accommodation with sea view" },
        { name: "Sunset Beach Cottages", lat: 12.8035, lon: 122.0505, type: "resort", description: "Private cottages on the beach" }
    ]
};

// Beautiful custom marker icons for each category
const MARKER_ICONS = {
    discovery: L.divIcon({
        html: '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(102,126,234,0.4); border: 2px solid white;"><i class="fa fa-landmark" style="color:white; font-size: 16px;"></i></div>',
        iconSize: [36, 36],
        popupAnchor: [0, -18],
        className: 'custom-marker'
    }),
    nature: L.divIcon({
        html: '<div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(17,153,142,0.4); border: 2px solid white;"><i class="fa fa-tree" style="color:white; font-size: 16px;"></i></div>',
        iconSize: [36, 36],
        popupAnchor: [0, -18],
        className: 'custom-marker'
    }),
    dining: L.divIcon({
        html: '<div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(240,147,251,0.4); border: 2px solid white;"><i class="fa fa-utensils" style="color:white; font-size: 16px;"></i></div>',
        iconSize: [36, 36],
        popupAnchor: [0, -18],
        className: 'custom-marker'
    }),
    resort: L.divIcon({
        html: '<div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(250,112,154,0.4); border: 2px solid white;"><i class="fa fa-hotel" style="color:white; font-size: 16px;"></i></div>',
        iconSize: [36, 36],
        popupAnchor: [0, -18],
        className: 'custom-marker'
    }),
    default: L.divIcon({
        html: '<div style="background: linear-gradient(135deg, #2f7c84 0%, #1a555a 100%); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(47,124,132,0.4); border: 2px solid white;"><i class="fa fa-map-marker-alt" style="color:white; font-size: 16px;"></i></div>',
        iconSize: [36, 36],
        popupAnchor: [0, -18],
        className: 'custom-marker'
    })
};

// Category to icon type mapping
const CATEGORY_ICON_TYPE = {
    'discovery': 'discovery',
    'nature': 'nature',
    'dining': 'dining',
    'resort': 'resort'
};

// Beautiful map tile options (choose your favorite)
const MAP_TILES = {
    // Option 1: CartoDB Voyager (Clean, modern look)
    voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    // Option 2: CartoDB Positron (Light, minimal)
    positron: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    // Option 3: OpenStreetMap Hot (Warm colors)
    hot: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    // Option 4: Stamen Terrain (Shows terrain features)
    terrain: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.jpg'
};

// Images for different place types
const PLACE_IMAGES = {
    lighthouse: "https://images.unsplash.com/photo-1507473885765-e6b057e04d4f?w=400&h=300&fit=crop",
    government: "https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?w=400&h=300&fit=crop",
    church: "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=400&h=300&fit=crop",
    viewpoint: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    waterfall: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=400&h=300&fit=crop",
    beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop",
    nature: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop",
    restaurant: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
    cafe: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop",
    bar: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop",
    resort: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
    hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop"
};

document.addEventListener('DOMContentLoaded', function() {
    if (typeof L === 'undefined') {
        console.error('Leaflet not loaded');
        return;
    }

    // Create beautiful map with custom tile layer
    map = L.map('map', {
        zoomControl: true,
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true
    }).setView([SIMARA_COORDS.lat, SIMARA_COORDS.lon], 14);
    
    // Use beautiful CartoDB Voyager tiles (clean and modern)
    L.tileLayer(MAP_TILES.voyager, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 3
    }).addTo(map);
    
    // Add subtle zoom control styling
    map.zoomControl.setPosition('bottomright');
    
    // Add scale bar
    L.control.scale({
        metric: true,
        imperial: false,
        position: 'bottomleft'
    }).addTo(map);
    
    // Add beautiful custom control for map info
    var infoControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function() {
            var div = L.DomUtil.create('div', 'map-info');
            div.innerHTML = '<div style="background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); padding: 8px 15px; border-radius: 30px; color: white; font-size: 12px; font-weight: 500;"><i class="fa fa-island"></i> Simara Island, Romblon</div>';
            return div;
        }
    });
    new infoControl().addTo(map);
    
    // Add Corcuera town marker with custom pulsing effect
    var pulsingIcon = L.divIcon({
        html: '<div style="position: relative;"><div style="background: #2f7c84; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 0 rgba(47,124,132,0.7); animation: pulse 1.5s infinite;"></div></div>',
        iconSize: [20, 20],
        className: 'pulse-marker'
    });
    
    L.marker([SIMARA_COORDS.lat, SIMARA_COORDS.lon], { icon: pulsingIcon })
        .bindPopup('<b>🏘️ Corcuera Town Center</b><br>Simara Island, Romblon')
        .addTo(map);
    
    // Add animation styles
    var style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(47,124,132,0.7); }
            70% { box-shadow: 0 0 0 15px rgba(47,124,132,0); }
            100% { box-shadow: 0 0 0 0 rgba(47,124,132,0); }
        }
        .custom-marker {
            transition: transform 0.2s ease;
        }
        .custom-marker:hover {
            transform: scale(1.1);
        }
        .leaflet-popup-content-wrapper {
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        }
        .leaflet-popup-tip {
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        }
        .leaflet-control-zoom a {
            background: white;
            border-radius: 12px;
            margin: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .route-info {
            animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `;
    document.head.appendChild(style);
    
    getUserLocation();
    loadPlacesByCategory('discovery');
    setupSearch();
    setupTabs();
    setupDirectionsHandler();

    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if (map) map.invalidateSize();
        }, 250);
    });
});

function loadPlacesByCategory(category) {
    currentCategory = category;
    clearMarkers();
    
    var places = REAL_SIMARA_PLACES[category];
    
    if (places && places.length > 0) {
        var markersData = [];
        for (var i = 0; i < places.length; i++) {
            var place = places[i];
            var distanceText = 'On Simara Island';
            
            if (userLocation) {
                var dist = calculateDistance(userLocation.lat, userLocation.lon, place.lat, place.lon);
                distanceText = dist.toFixed(1) + ' km from your location';
            }
            
            var rating = (Math.random() * 1.5 + 3.5).toFixed(1);
            var imageUrl = PLACE_IMAGES[place.type] || PLACE_IMAGES.beach;
            
            markersData.push({
                coords: [place.lat, place.lon],
                title: place.name,
                img: imageUrl,
                rating: rating,
                distance: distanceText,
                description: place.description,
                type: place.type,
                category: category
            });
        }
        addMarkersToMap(markersData);
    } else {
        showNoResultsMessage();
    }
}

function searchSimaraPlaces(searchText) {
    var searchLower = searchText.toLowerCase();
    var allResults = [];
    var categories = ['discovery', 'nature', 'dining', 'resort'];
    
    for (var c = 0; c < categories.length; c++) {
        var places = REAL_SIMARA_PLACES[categories[c]];
        for (var i = 0; i < places.length; i++) {
            var place = places[i];
            if (place.name.toLowerCase().indexOf(searchLower) !== -1 || 
                place.description.toLowerCase().indexOf(searchLower) !== -1) {
                
                var distanceText = 'On Simara Island';
                if (userLocation) {
                    var dist = calculateDistance(userLocation.lat, userLocation.lon, place.lat, place.lon);
                    distanceText = dist.toFixed(1) + ' km from your location';
                }
                
                var rating = (Math.random() * 1.5 + 3.5).toFixed(1);
                var imageUrl = PLACE_IMAGES[place.type] || PLACE_IMAGES.beach;
                
                allResults.push({
                    coords: [place.lat, place.lon],
                    title: place.name,
                    img: imageUrl,
                    rating: rating,
                    distance: distanceText,
                    description: place.description,
                    type: place.type,
                    category: categories[c]
                });
            }
        }
    }
    
    return allResults;
}

// ============ BEAUTIFUL MAP MARKERS WITH POPUPS ============
function addMarkersToMap(places) {
    currentMarkers = [];
    
    for (var i = 0; i < places.length; i++) {
        var place = places[i];
        var safeTitle = place.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        var safeDesc = (place.description || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        // Get appropriate icon based on category
        var iconType = CATEGORY_ICON_TYPE[place.category] || 'default';
        var markerIcon = MARKER_ICONS[iconType] || MARKER_ICONS.default;
        
        var popupContent = '<div style="min-width:280px;padding:0;border-radius:16px;overflow:hidden;">' +
            '<img src="' + place.img + '" style="width:100%;height:140px;object-fit:cover;">' +
            '<div style="padding:15px;">' +
            '<h4 style="color:#2d6f77;margin:0 0 8px 0;font-size:18px;font-weight:600;">' + place.title + '</h4>' +
            '<p style="font-size:12px;color:#6b7280;margin:0 0 10px 0;line-height:1.4;">' + safeDesc + '</p>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
            '<span style="background:#22c55e20;color:#22c55e;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:500;"><i class="fa fa-circle" style="font-size:8px;margin-right:5px;"></i> OPEN NOW</span>' +
            '<span style="background:#f59e0b20;color:#f59e0b;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;"><i class="fa fa-star"></i> ' + place.rating + '</span>' +
            '</div>' +
            '<div style="background:#f3f4f6;padding:8px 12px;border-radius:12px;margin-bottom:12px;">' +
            '<i class="fa fa-location-dot" style="color:#2f7c84;margin-right:8px;"></i>' +
            '<span style="font-size:12px;color:#374151;">' + place.distance + '</span>' +
            '</div>' +
            '<button class="popup-dir-btn" data-lat="' + place.coords[0] + '" data-lng="' + place.coords[1] + '" data-title="' + safeTitle + '" style="width:100%;padding:12px;background:linear-gradient(135deg, #2f7c84 0%, #1a555a 100%);color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;font-size:14px;transition:transform 0.2s;">' +
            '<i class="fa fa-directions" style="margin-right:8px;"></i> Get Directions' +
            '</button>' +
            '</div>' +
            '</div>';
        
        var marker = L.marker(place.coords, { icon: markerIcon })
            .bindPopup(popupContent, {
                maxWidth: 320,
                minWidth: 280,
                className: 'beautiful-popup'
            });
        
        marker.addTo(map);
        currentMarkers.push(marker);
    }
    
    if (currentMarkers.length > 1) {
        var group = L.featureGroup(currentMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
    } else if (currentMarkers.length === 1) {
        map.setView(currentMarkers[0].getLatLng(), 15);
    }
}

function clearMarkers() {
    if (map) {
        map.closePopup();
    }
    for (var i = 0; i < currentMarkers.length; i++) {
        map.removeLayer(currentMarkers[i]);
    }
    currentMarkers = [];
}

function showLoading() {
    var mapDiv = document.getElementById('map');
    if (mapDiv) mapDiv.style.opacity = '0.7';
}

function hideLoading() {
    var mapDiv = document.getElementById('map');
    if (mapDiv) mapDiv.style.opacity = '1';
}

function showNoResultsMessage() {
    var tempPopup = L.popup()
        .setLatLng([SIMARA_COORDS.lat, SIMARA_COORDS.lon])
        .setContent('<div style="padding:15px;text-align:center;"><i class="fa fa-map-marker-alt" style="font-size:24px;color:#2f7c84;margin-bottom:10px;"></i><br>📍 No places found<br>Try another category</div>')
        .openOn(map);
    
    setTimeout(function() {
        map.closePopup();
    }, 3000);
}

// ============ SEARCH ============
function setupSearch() {
    var searchInput = document.getElementById('mapSearch');
    if (!searchInput) return;
    
    var searchTimeout;
    
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function() {
            var query = e.target.value.trim();
            if (query.length > 2) {
                var results = searchSimaraPlaces(query);
                
                if (results.length > 0) {
                    clearMarkers();
                    addMarkersToMap(results);
                } else {
                    showNoResultsMessage();
                }
            } else if (query.length === 0) {
                loadPlacesByCategory(currentCategory);
            }
        }, 500);
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            var query = e.target.value.trim();
            if (query.length > 0) {
                var results = searchSimaraPlaces(query);
                
                if (results.length > 0) {
                    clearMarkers();
                    addMarkersToMap(results);
                } else {
                    showNoResultsMessage();
                }
            }
        }
    });
}

// ============ TABS ============
function setupTabs() {
    var tabs = document.querySelectorAll('.tabs button');
    var categories = ['discovery', 'nature', 'dining', 'resort'];
    
    for (var i = 0; i < tabs.length; i++) {
        (function(index) {
            tabs[index].addEventListener('click', function() {
                for (var j = 0; j < tabs.length; j++) {
                    tabs[j].classList.remove('active');
                }
                this.classList.add('active');
                loadPlacesByCategory(categories[index]);
            });
        })(i);
    }
}

// ============ DIRECTIONS ============
function setupDirectionsHandler() {
    document.addEventListener('click', function(e) {
        if (e.target.classList && e.target.classList.contains('popup-dir-btn')) {
            e.stopPropagation();
            var lat = parseFloat(e.target.dataset.lat);
            var lng = parseFloat(e.target.dataset.lng);
            var title = e.target.dataset.title || 'Destination';
            
            if (!isNaN(lat) && !isNaN(lng)) {
                var startLat = userLocation ? userLocation.lat : SIMARA_COORDS.lat;
                var startLng = userLocation ? userLocation.lon : SIMARA_COORDS.lon;
                showDirections(startLat, startLng, lat, lng, title);
            }
        }
    });
}

function showDirections(startLat, startLng, endLat, endLng, title) {
    if (currentRoute) {
        map.removeControl(currentRoute);
        currentRoute = null;
    }
    if (window.currentRouteInfo) {
        map.removeControl(window.currentRouteInfo);
        window.currentRouteInfo = null;
    }
    
    map.closePopup();
    
    try {
        currentRoute = L.Routing.control({
            waypoints: [
                L.latLng(startLat, startLng),
                L.latLng(endLat, endLng)
            ],
            routeWhileDragging: true,
            showAlternatives: false,
            show: true,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            lineOptions: {
                styles: [{color: '#2f7c84', weight: 5, opacity: 0.8, lineCap: 'round', lineJoin: 'round'}]
            },
            createMarker: function(i, wp) {
                if (i === 0) {
                    return L.marker(wp.latLng, {
                        icon: L.divIcon({
                            html: '<div style="background: linear-gradient(135deg, #4CAF50, #45a049); width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"></div>',
                            iconSize: [24, 24],
                            className: 'start-marker'
                        })
                    }).bindPopup('<b>📍 Your Location</b>');
                } else if (i === 1) {
                    return L.marker(wp.latLng, {
                        icon: L.divIcon({
                            html: '<div style="background: linear-gradient(135deg, #2f7c84, #1a555a); width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"><i class="fa fa-flag-checkered" style="color:white; font-size:12px; position:absolute; top:6px; left:6px;"></i></div>',
                            iconSize: [24, 24],
                            className: 'end-marker'
                        })
                    }).bindPopup('<b>🏁 ' + title + '</b>');
                }
                return null;
            }
        }).addTo(map);
        
        currentRoute.on('routesfound', function(e) {
            var route = e.routes[0];
            var distance = (route.summary.totalDistance / 1000).toFixed(1);
            var time = Math.round(route.summary.totalTime / 60);
            
            var RouteInfoControl = L.Control.extend({
                options: { position: 'bottomleft' },
                onAdd: function() {
                    var div = L.DomUtil.create('div', 'route-info');
                    div.innerHTML = '<div style="background: white; padding: 12px 18px; border-radius: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); font-size: 13px; min-width: 170px; backdrop-filter: blur(10px); background: rgba(255,255,255,0.95);">' +
                        '<i class="fa fa-car" style="color:#2f7c84; margin-right:8px;"></i><strong>' + title + '</strong><br>' +
                        '<i class="fa fa-road" style="color:#6b7280; margin-right:5px;"></i> ' + distance + ' km  |  ' +
                        '<i class="fa fa-clock" style="color:#6b7280; margin-right:5px;"></i> ' + time + ' min' +
                        '<button onclick="window.clearRoute()" style="margin-left: 12px; background: #ef4444; border: none; padding: 4px 12px; border-radius: 20px; color: white; cursor: pointer; font-size: 11px; font-weight: 500;">✕ Close</button>' +
                        '</div>';
                    return div;
                }
            });
            
            window.currentRouteInfo = new RouteInfoControl();
            window.currentRouteInfo.addTo(map);
        });
        
    } catch (error) {
        console.error('Routing error:', error);
        alert('Directions not available. Please try again.');
    }
}

window.clearRoute = function() {
    if (currentRoute) {
        map.removeControl(currentRoute);
        currentRoute = null;
    }
    if (window.currentRouteInfo) {
        map.removeControl(window.currentRouteInfo);
        window.currentRouteInfo = null;
    }
};

// ============ USER LOCATION ============
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                userLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                
                // Beautiful user location marker with pulse effect
                var userIcon = L.divIcon({
                    html: '<div style="position: relative;"><div style="background: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 0 rgba(76,175,80,0.7); animation: pulse 1.5s infinite;"></div><div style="background: rgba(76,175,80,0.2); width: 40px; height: 40px; border-radius: 50%; position: absolute; top: -10px; left: -10px; animation: ripple 2s infinite;"></div></div>',
                    iconSize: [20, 20],
                    className: 'user-marker'
                });
                
                L.marker([userLocation.lat, userLocation.lon], { icon: userIcon })
                    .bindPopup('<b>📍 Your Location</b>')
                    .addTo(map);
                
                // Add ripple animation
                var rippleStyle = document.createElement('style');
                rippleStyle.textContent = `
                    @keyframes ripple {
                        0% { transform: scale(1); opacity: 0.6; }
                        100% { transform: scale(2); opacity: 0; }
                    }
                `;
                document.head.appendChild(rippleStyle);
                
                loadPlacesByCategory(currentCategory);
            },
            function(error) {
                console.log('Location access denied:', error);
                userLocation = SIMARA_COORDS;
            }
        );
    } else {
        userLocation = SIMARA_COORDS;
    }
}

// ============ HELPER FUNCTIONS ============
function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
} 