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
let placesData = null;

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

// Icon mapping for place types (used when no image is provided)
const PLACE_ICONS = {
    lighthouse: '<i class="fa fa-lightbulb-o" style="font-size: 48px; color: #667eea;"></i>',
    government: '<i class="fa fa-university" style="font-size: 48px; color: #667eea;"></i>',
    church: '<i class="fa fa-church" style="font-size: 48px; color: #667eea;"></i>',
    viewpoint: '<i class="fa fa-eye" style="font-size: 48px; color: #667eea;"></i>',
    waterfall: '<i class="fa fa-tint" style="font-size: 48px; color: #11998e;"></i>',
    beach: '<i class="fa fa-umbrella-beach" style="font-size: 48px; color: #11998e;"></i>',
    nature: '<i class="fa fa-leaf" style="font-size: 48px; color: #11998e;"></i>',
    restaurant: '<i class="fa fa-cutlery" style="font-size: 48px; color: #f093fb;"></i>',
    cafe: '<i class="fa fa-coffee" style="font-size: 48px; color: #f093fb;"></i>',
    bar: '<i class="fa fa-glass" style="font-size: 48px; color: #f093fb;"></i>',
    resort: '<i class="fa fa-building-o" style="font-size: 48px; color: #fa709a;"></i>',
    hotel: '<i class="fa fa-bed" style="font-size: 48px; color: #fa709a;"></i>',
    default: '<i class="fa fa-map-marker" style="font-size: 48px; color: #2f7c84;"></i>'
};

// Category to icon type mapping
const CATEGORY_ICON_TYPE = {
    'discovery': 'discovery',
    'nature': 'nature',
    'dining': 'dining',
    'resort': 'resort'
};

// Beautiful map tile options
const MAP_TILES = {
    voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    positron: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
};

// Load places from JSON file
async function loadPlacesFromJSON() {
    try {
        const response = await fetch('places.json');
        const data = await response.json();
        placesData = data.places;
        console.log('Places loaded successfully!', placesData);
        return placesData;
    } catch (error) {
        console.error('Error loading places.json:', error);
        return getFallbackPlaces();
    }
}

// Fallback data in case JSON fails to load
function getFallbackPlaces() {
    return {
        discovery: [
            { name: "Simara Island Lighthouse", lat: 12.8092, lon: 122.0512, type: "lighthouse", description: "Historic lighthouse", rating: 4.8 },
            { name: "Corcuera Municipal Hall", lat: 12.8055, lon: 122.0474, type: "government", description: "Town hall", rating: 4.5 }
        ],
        nature: [
            { name: "Taclobo Beach", lat: 12.8020, lon: 122.0500, type: "beach", description: "White sand beach", rating: 4.8 }
        ],
        dining: [
            { name: "Simara Seafood Grill", lat: 12.8060, lon: 122.0475, type: "restaurant", description: "Fresh seafood", rating: 4.6 }
        ],
        resort: [
            { name: "Simara Island Resort", lat: 12.8070, lon: 122.0500, type: "resort", description: "Beachfront resort", rating: 4.9 }
        ]
    };
}

// Get icon HTML for a place type (used when no image)
function getPlaceIcon(type) {
    return PLACE_ICONS[type] || PLACE_ICONS.default;
}

document.addEventListener('DOMContentLoaded', async function() {
    if (typeof L === 'undefined') {
        console.error('Leaflet not loaded');
        return;
    }

    // Load places from JSON first
    await loadPlacesFromJSON();

    map = L.map('map', {
        zoomControl: true,
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true
    }).setView([SIMARA_COORDS.lat, SIMARA_COORDS.lon], 14);
    
    L.tileLayer(MAP_TILES.voyager, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 3
    }).addTo(map);
    
    map.zoomControl.setPosition('bottomright');
    
    L.control.scale({
        metric: true,
        imperial: false,
        position: 'bottomleft'
    }).addTo(map);
    
    // Add animation styles
    var style = document.createElement('style');
    style.textContent = `
        .custom-marker {
            transition: transform 0.2s ease;
            cursor: pointer;
        }
        .custom-marker:hover {
            transform: scale(1.1);
        }
        .leaflet-control-zoom a {
            background: white;
            border-radius: 12px;
            margin: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .place-icon-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: linear-gradient(135deg, #f8fafc, #e2e8f0);
            border-radius: 16px;
            text-align: center;
        }
        .place-icon-container i {
            margin-bottom: 10px;
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
    if (!placesData) return;
    
    currentCategory = category;
    clearMarkers();
    
    var places = placesData[category];
    
    if (places && places.length > 0) {
        var markersData = [];
        for (var i = 0; i < places.length; i++) {
            var place = places[i];
            var distanceText = 'On Simara Island';
            
            if (userLocation) {
                var dist = calculateDistance(userLocation.lat, userLocation.lon, place.lat, place.lon);
                distanceText = dist.toFixed(1) + ' km from your location';
            }
            
            var rating = place.rating || (Math.random() * 1.5 + 3.5).toFixed(1);
            // Use image if provided, otherwise use null (will show icon)
            var imageUrl = place.image || null;
            
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
    if (!placesData) return [];
    
    var searchLower = searchText.toLowerCase();
    var allResults = [];
    var categories = ['discovery', 'nature', 'dining', 'resort'];
    
    for (var c = 0; c < categories.length; c++) {
        var places = placesData[categories[c]];
        if (!places) continue;
        
        for (var i = 0; i < places.length; i++) {
            var place = places[i];
            if (place.name.toLowerCase().indexOf(searchLower) !== -1 || 
                place.description.toLowerCase().indexOf(searchLower) !== -1) {
                
                var distanceText = 'On Simara Island';
                if (userLocation) {
                    var dist = calculateDistance(userLocation.lat, userLocation.lon, place.lat, place.lon);
                    distanceText = dist.toFixed(1) + ' km from your location';
                }
                
                var rating = place.rating || (Math.random() * 1.5 + 3.5).toFixed(1);
                var imageUrl = place.image || null;
                
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

// ============ MARKERS WITH NO POPUP - ONLY BOTTOM CARD ============
function addMarkersToMap(places) {
    currentMarkers = [];
    
    for (var i = 0; i < places.length; i++) {
        var place = places[i];
        
        var iconType = CATEGORY_ICON_TYPE[place.category] || 'default';
        var markerIcon = MARKER_ICONS[iconType] || MARKER_ICONS.default;
        
        var marker = L.marker(place.coords, { icon: markerIcon })
            .on('click', function(p) {
                return function() {
                    showLocationCard(p);
                };
            }(place));
        
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

// ============ BOTTOM LOCATION CARD ============
function showLocationCard(place) {
    var locationCard = document.getElementById('locationCard');
    if (!locationCard) return;
    
    document.getElementById('cardTitle').textContent = place.title;
    
    // Show image if available, otherwise show icon
    var cardImg = document.getElementById('cardImg');
    if (place.img && place.img !== '') {
        cardImg.src = place.img;
        cardImg.style.display = 'block';
        cardImg.style.height = '120px';
        // Remove any icon container if exists
        var iconContainer = cardImg.parentNode.querySelector('.icon-placeholder');
        if (iconContainer) iconContainer.remove();
    } else {
        // Hide image and show icon instead
        cardImg.style.display = 'none';
        // Check if icon container already exists
        var existingIcon = cardImg.parentNode.querySelector('.icon-placeholder');
        if (!existingIcon) {
            var iconDiv = document.createElement('div');
            iconDiv.className = 'icon-placeholder';
            iconDiv.style.cssText = `
                width: 100%;
                height: 120px;
                background: linear-gradient(135deg, #f8fafc, #e2e8f0);
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 16px 16px 0 0;
            `;
            iconDiv.innerHTML = getPlaceIcon(place.type);
            cardImg.parentNode.insertBefore(iconDiv, cardImg);
        }
    }
    
    var hour = new Date().getHours();
    var isOpen = hour >= 8 && hour <= 20;
    var statusEl = document.getElementById('cardStatus');
    statusEl.textContent = isOpen ? 'OPEN NOW' : 'CLOSED';
    statusEl.style.color = isOpen ? '#22c55e' : '#ef4444';
    
    document.getElementById('cardRating').innerHTML = '<i class="fa-solid fa-star"></i> ' + place.rating;
    document.getElementById('cardDistance').innerHTML = '<i class="fa-solid fa-location-dot"></i> ' + place.distance;
    
    var cardDirectionsBtn = document.getElementById('cardDirections');
    cardDirectionsBtn.dataset.lat = place.coords[0];
    cardDirectionsBtn.dataset.lng = place.coords[1];
    cardDirectionsBtn.dataset.title = place.title;
    
    locationCard.dataset.currentTitle = place.title;
    
    locationCard.style.display = 'flex';
    locationCard.style.animation = 'slideUp 0.3s ease';
    
    if (!document.querySelector('#slideUpStyle')) {
        var animStyle = document.createElement('style');
        animStyle.id = 'slideUpStyle';
        animStyle.textContent = `
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(animStyle);
    }
}

function clearMarkers() {
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
    var locationCard = document.getElementById('locationCard');
    if (locationCard) {
        document.getElementById('cardTitle').textContent = 'No places found';
        document.getElementById('cardImg').src = '';
        document.getElementById('cardImg').style.display = 'none';
        
        var existingIcon = document.getElementById('cardImg').parentNode.querySelector('.icon-placeholder');
        if (!existingIcon) {
            var iconDiv = document.createElement('div');
            iconDiv.className = 'icon-placeholder';
            iconDiv.style.cssText = `
                width: 100%;
                height: 120px;
                background: linear-gradient(135deg, #f8fafc, #e2e8f0);
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 16px 16px 0 0;
            `;
            iconDiv.innerHTML = '<i class="fa fa-map-marker" style="font-size: 48px; color: #94a3b8;"></i>';
            document.getElementById('cardImg').parentNode.insertBefore(iconDiv, document.getElementById('cardImg'));
        }
        
        document.getElementById('cardStatus').textContent = 'TRY ANOTHER';
        document.getElementById('cardRating').innerHTML = '<i class="fa-solid fa-star"></i> 0.0';
        document.getElementById('cardDistance').innerHTML = '<i class="fa-solid fa-location-dot"></i> No results';
        locationCard.style.display = 'flex';
        
        setTimeout(function() {
            if (document.getElementById('cardTitle').textContent === 'No places found') {
                locationCard.style.display = 'none';
            }
        }, 3000);
    }
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
                    if (results[0]) {
                        showLocationCard(results[0]);
                    }
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
                    if (results[0]) {
                        showLocationCard(results[0]);
                    }
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
                var card = document.getElementById('locationCard');
                if (card) card.style.display = 'none';
                loadPlacesByCategory(categories[index]);
            });
        })(i);
    }
}

// ============ DIRECTIONS ============
function setupDirectionsHandler() {
    var cardDirectionsBtn = document.getElementById('cardDirections');
    if (cardDirectionsBtn) {
        cardDirectionsBtn.addEventListener('click', function() {
            var lat = parseFloat(this.dataset.lat);
            var lng = parseFloat(this.dataset.lng);
            var title = this.dataset.title || 'Destination';
            
            if (!isNaN(lat) && !isNaN(lng)) {
                var startLat = userLocation ? userLocation.lat : SIMARA_COORDS.lat;
                var startLng = userLocation ? userLocation.lon : SIMARA_COORDS.lon;
                showDirections(startLat, startLng, lat, lng, title);
            }
        });
    }
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
                
                var userIcon = L.divIcon({
                    html: '<div style="position: relative;"><div style="background: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 0 rgba(76,175,80,0.7); animation: pulse 1.5s infinite;"></div></div>',
                    iconSize: [20, 20],
                    className: 'user-marker'
                });
                
                L.marker([userLocation.lat, userLocation.lon], { icon: userIcon })
                    .bindPopup('<b>📍 Your Location</b>')
                    .addTo(map);
                
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

var pulseStyle = document.createElement('style');
pulseStyle.textContent = `
    @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(76,175,80,0.7); }
        70% { box-shadow: 0 0 0 15px rgba(76,175,80,0); }
        100% { box-shadow: 0 0 0 0 rgba(76,175,80,0); }
    }
`;
document.head.appendChild(pulseStyle);

// ============ SHARE & FAVORITE BUTTONS ============
document.addEventListener('DOMContentLoaded', function() {
    var shareBtn = document.querySelector('.share');
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            var title = document.getElementById('cardTitle')?.textContent || 'Simara Island';
            
            if (navigator.share) {
                navigator.share({
                    title: title,
                    text: 'Check out ' + title + ' on Simara Island, Corcuera, Romblon!',
                    url: window.location.href
                }).catch(function(e) { console.log('Sharing cancelled'); });
            } else {
                navigator.clipboard.writeText(title + ' - Simara Island, Corcuera, Romblon');
                alert('Link copied to clipboard!');
            }
        });
    }
    
    var heartBtn = document.querySelector('.fa-heart');
    if (heartBtn) {
        heartBtn.addEventListener('click', function(e) {
            e.target.classList.toggle('fas');
            e.target.classList.toggle('far');
            
            var title = document.getElementById('cardTitle')?.textContent;
            if (title) {
                var favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
                if (e.target.classList.contains('fas')) {
                    if (!favorites.includes(title)) {
                        favorites.push(title);
                        showToast('Added ' + title + ' to favorites!');
                    }
                } else {
                    favorites = favorites.filter(function(f) { return f !== title; });
                    showToast('Removed ' + title + ' from favorites');
                }
                localStorage.setItem('favorites', JSON.stringify(favorites));
            }
        });
    }
});

function showToast(message) {
    var toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 180px;
        left: 50%;
        transform: translateX(-50%);
        background: #1e293b;
        color: white;
        padding: 10px 20px;
        border-radius: 30px;
        z-index: 2000;
        font-size: 13px;
        animation: fadeInOut 2s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 2000);
}

var toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
        85% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(toastStyle);

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