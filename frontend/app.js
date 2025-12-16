// Open Source / No Token Setup
const map = new maplibregl.Map({
    container: 'map',
    style: {
        'version': 8,
        'sources': {
            'osm': {
                'type': 'raster',
                'tiles': [
                    'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'
                ],
                'tileSize': 256,
                'attribution': '&copy; OpenStreetMap Contributors',
                'maxzoom': 19
            }
        },
        'layers': [
            {
                'id': 'osm',
                'type': 'raster',
                'source': 'osm'
            }
        ]
    },
    center: [139.6917, 35.6895], // Tokyo
    zoom: 1.5
});

let allLocations = [];
let isPlaying = false;
let animationFrameId = null;
let speedFactor = 1000; // Multiplier for playback speed

const playBtn = document.getElementById('playBtn');
const timeSlider = document.getElementById('timeSlider');
const dateDisplay = document.getElementById('dateDisplay');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const statsDiv = document.getElementById('stats');

map.on('load', loadData);

// Data Loading
async function loadData() {
    try {
        statsDiv.innerText = 'Fetching data...';
        const response = await fetch('http://127.0.0.1:8000/api/locations/');
        if (!response.ok) throw new Error('API Error');

        const data = await response.json();

        // Sort by timestamp just in case
        data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        allLocations = data;

        statsDiv.innerText = `Loaded ${data.length} points`;

        if (data.length === 0) return;

        initializeMapData();

    } catch (error) {
        console.error('Error fetching data:', error);
        statsDiv.innerText = 'Error loading data. backend running?';
    }
}

function initializeMapData() {
    if (allLocations.length === 0) return;

    // Remove existing layers if any
    if (map.getSource('route')) {
        map.removeLayer('route-glow');
        map.removeLayer('route');
        map.removeSource('route');
    }

    // Initial Full Path
    const coordinates = allLocations.map(loc => [loc.longitude, loc.latitude]);

    // Setup GeoJSON source
    const geojson = {
        'type': 'FeatureCollection',
        'features': [{
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': coordinates
            }
        }]
    };

    map.addSource('route', {
        'type': 'geojson',
        'data': geojson
    });

    // Add Lines
    map.addLayer({
        'id': 'route',
        'type': 'line',
        'source': 'route',
        'layout': { 'line-join': 'round', 'line-cap': 'round' },
        'paint': {
            'line-color': '#00f2fe',
            'line-width': 3,
            'line-opacity': 0.8
        }
    });

    map.addLayer({
        'id': 'route-glow',
        'type': 'line',
        'source': 'route',
        'layout': { 'line-join': 'round', 'line-cap': 'round' },
        'paint': {
            'line-color': '#4facfe',
            'line-width': 10,
            'line-opacity': 0.4,
            'line-blur': 10
        },
        'beforeId': 'route'
    });

    // Initialize Slider
    timeSlider.min = 0;
    timeSlider.max = allLocations.length - 1;
    timeSlider.value = allLocations.length - 1;
    updateVisualization(allLocations.length - 1);

    // Fly to latest
    const lastLoc = coordinates[coordinates.length - 1];
    map.flyTo({ center: lastLoc, zoom: 4, speed: 1.5 }); // Lower zoom for raster map
}

// Visualization Update Logic
function updateVisualization(index) {
    if (!map.getSource('route') || allLocations.length === 0) return;

    // Clamp index
    index = Math.max(0, Math.min(index, allLocations.length - 1));
    index = Math.floor(index);

    // Slice data up to current index
    const visibleLocations = allLocations.slice(0, index + 1);
    const coordinates = visibleLocations.map(loc => [loc.longitude, loc.latitude]);

    const geojson = {
        'type': 'FeatureCollection',
        'features': [{
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': coordinates
            }
        }]
    };

    map.getSource('route').setData(geojson);

    // Update Date Display
    const currentLoc = allLocations[index];
    if (currentLoc) {
        const date = new Date(currentLoc.timestamp);
        dateDisplay.innerText = date.toLocaleString();
    }
}

// Playback Logic
playBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playBtn.innerText = isPlaying ? '⏸' : '▶';

    if (isPlaying) {
        if (parseInt(timeSlider.value) >= allLocations.length - 1) {
            timeSlider.value = 0;
        }
        animate();
    } else {
        cancelAnimationFrame(animationFrameId);
    }
});

function animate() {
    if (!isPlaying) return;

    let currentValue = parseInt(timeSlider.value);
    let nextValue = currentValue + 5;

    if (nextValue >= allLocations.length - 1) {
        nextValue = allLocations.length - 1;
        isPlaying = false;
        playBtn.innerText = '▶';
    }

    timeSlider.value = nextValue;
    updateVisualization(nextValue);

    if (isPlaying) {
        animationFrameId = requestAnimationFrame(animate);
    }
}

// Slider Input
timeSlider.addEventListener('input', (e) => {
    isPlaying = false;
    playBtn.innerText = '▶';
    cancelAnimationFrame(animationFrameId);
    updateVisualization(e.target.value);
});

// File Upload
uploadBtn.addEventListener('click', () => fileInput.click());
const demoBtn = document.getElementById('demoBtn');

demoBtn.addEventListener('click', () => {
    generateDemoData();
});

function generateDemoData() {
    statsDiv.innerText = 'Generating demo path...';

    const waypoints = [
        { lat: 35.6895, lng: 139.6917, name: "Tokyo" },
        { lat: 35.3606, lng: 138.7274, name: "Mt Fuji" },
        { lat: 35.1815, lng: 136.9066, name: "Nagoya" },
        { lat: 35.0116, lng: 135.7681, name: "Kyoto" },
        { lat: 34.6937, lng: 135.5023, name: "Osaka" }
    ];

    const demoLocations = [];
    const startTime = new Date().getTime();

    for (let i = 0; i < waypoints.length - 1; i++) {
        const start = waypoints[i];
        const end = waypoints[i + 1];
        const steps = 50;

        for (let j = 0; j <= steps; j++) {
            const t = j / steps;
            const lat = start.lat + (end.lat - start.lat) * t;
            const lng = start.lng + (end.lng - start.lng) * t;
            const noise = Math.sin(t * Math.PI) * 0.05;

            const timestamp = new Date(startTime + (demoLocations.length * 3600000));

            demoLocations.push({
                latitude: lat + noise,
                longitude: lng + noise,
                timestamp: timestamp.toISOString()
            });
        }
    }

    allLocations = demoLocations;
    statsDiv.innerText = `Loaded ${allLocations.length} demo points`;
    initializeMapData();
    setTimeout(() => {
        if (!isPlaying) playBtn.click();
    }, 1000);
}

// Dashboard Elements
const dashboard = document.getElementById('manual-dashboard');
const startInput = document.getElementById('startInput');
const endInput = document.getElementById('endInput');
const pickStartBtn = document.getElementById('pickStartBtn');
const pickEndBtn = document.getElementById('pickEndBtn');
const searchStartBtn = document.getElementById('searchStartBtn');
const searchEndBtn = document.getElementById('searchEndBtn');
const createTripBtn = document.getElementById('createTripBtn');
const cancelTripBtn = document.getElementById('cancelTripBtn');
const dashInstruction = document.getElementById('dash-instruction');
const addTripBtn = document.getElementById('addTripBtn'); // From main UI

// State
let pickingMode = null; // 'start' or 'end'
let tripStartPoint = null;
let tripEndPoint = null;
let startMarker = null;
let endMarker = null;

// Search Logic (Geocoding)
async function searchCity(query, type) {
    if (!query) return;

    dashInstruction.innerText = `Searching for "${query}"...`;

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const results = await response.json();

        if (results.length === 0) {
            dashInstruction.innerText = 'Location not found. Try again.';
            return;
        }

        const loc = results[0];
        const coords = { lng: parseFloat(loc.lon), lat: parseFloat(loc.lat) };
        const displayName = loc.display_name.split(',')[0]; // Keep it short

        // Update State
        if (type === 'start') {
            tripStartPoint = coords;
            startInput.value = displayName;
            if (startMarker) startMarker.remove();
            startMarker = new maplibregl.Marker({ color: "#00ff00" })
                .setLngLat(coords)
                .setPopup(new maplibregl.Popup().setText(displayName))
                .addTo(map);
        } else {
            tripEndPoint = coords;
            endInput.value = displayName;
            if (endMarker) endMarker.remove();
            endMarker = new maplibregl.Marker({ color: "#ff0000" })
                .setLngLat(coords)
                .setPopup(new maplibregl.Popup().setText(displayName))
                .addTo(map);
        }

        map.flyTo({ center: coords, zoom: 10 });
        dashInstruction.innerText = `Found: ${displayName}`;

        if (tripStartPoint && tripEndPoint) {
            createTripBtn.disabled = false;
        }

    } catch (e) {
        console.error(e);
        dashInstruction.innerText = 'Search Error.';
    }
}

// Event Listeners for Search
if (searchStartBtn) {
    searchStartBtn.addEventListener('click', () => searchCity(startInput.value, 'start'));
}
if (startInput) {
    startInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchCity(startInput.value, 'start'); });
}

if (searchEndBtn) {
    searchEndBtn.addEventListener('click', () => searchCity(endInput.value, 'end'));
}
if (endInput) {
    endInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchCity(endInput.value, 'end'); });
}

// Open Dashboard
addTripBtn.addEventListener('click', () => {
    dashboard.style.display = 'block';
    resetDashboard();
});

// Cancel
cancelTripBtn.addEventListener('click', () => {
    dashboard.style.display = 'none';
    clearMarkers();
    resetDashboard();
});

function resetDashboard() {
    pickingMode = null;
    tripStartPoint = null;
    tripEndPoint = null;
    startInput.value = '';
    endInput.value = '';
    createTripBtn.disabled = true;
    pickStartBtn.classList.remove('active');
    pickEndBtn.classList.remove('active');
    dashInstruction.innerText = 'Select "Pick" then click on map.';
    map.getCanvas().style.cursor = '';
    clearMarkers();
}

function clearMarkers() {
    if (startMarker) startMarker.remove();
    if (endMarker) endMarker.remove();
    startMarker = null;
    endMarker = null;
}

// Pick Button Logic
pickStartBtn.addEventListener('click', () => {
    pickingMode = 'start';
    pickStartBtn.classList.add('active');
    pickEndBtn.classList.remove('active');
    dashInstruction.innerText = 'Click on Map to set Start Point';
    map.getCanvas().style.cursor = 'crosshair';
});

pickEndBtn.addEventListener('click', () => {
    pickingMode = 'end';
    pickEndBtn.classList.add('active');
    pickStartBtn.classList.remove('active');
    dashInstruction.innerText = 'Click on Map to set End Point';
    map.getCanvas().style.cursor = 'crosshair';
});

// Map Click Logic
map.on('click', (e) => {
    if (!pickingMode || dashboard.style.display === 'none') return;

    const coords = e.lngLat;
    const coordsText = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;

    if (pickingMode === 'start') {
        tripStartPoint = coords;
        startInput.value = coordsText;
        if (startMarker) startMarker.remove();
        startMarker = new maplibregl.Marker({ color: "#00ff00" })
            .setLngLat(coords)
            .addTo(map);
    } else if (pickingMode === 'end') {
        tripEndPoint = coords;
        endInput.value = coordsText;
        if (endMarker) endMarker.remove();
        endMarker = new maplibregl.Marker({ color: "#ff0000" })
            .setLngLat(coords)
            .addTo(map);
    }

    // Check if ready
    if (tripStartPoint && tripEndPoint) {
        createTripBtn.disabled = false;
        dashInstruction.innerText = 'Ready to Create Trip!';
    }

    // Reset picker state slightly but keep marker
    pickingMode = null;
    pickStartBtn.classList.remove('active');
    pickEndBtn.classList.remove('active');
    map.getCanvas().style.cursor = '';
});

// Create Logic
createTripBtn.addEventListener('click', async () => {
    if (!tripStartPoint || !tripEndPoint) return;

    createTripBtn.innerText = 'Generating...';
    createTripBtn.disabled = true;

    await createManualPath(tripStartPoint, tripEndPoint);

    // Close and reset
    dashboard.style.display = 'none';
    resetDashboard();
    createTripBtn.innerText = 'Create Trip';

    // Reload
    setTimeout(loadData, 500);
});

async function createManualPath(start, end) {
    const points = [];
    const steps = 50;
    const startTime = new Date(); // Use current time

    // Calculate total duration (e.g., 2 hours simulated)
    const durationMs = 2 * 60 * 60 * 1000;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lat = start.lat + (end.lat - start.lat) * t;
        const lng = start.lng + (end.lng - start.lng) * t;

        const jitter = 0.001;
        const noiseLat = (Math.random() - 0.5) * jitter;
        const noiseLng = (Math.random() - 0.5) * jitter;

        const timestamp = new Date(startTime.getTime() + (durationMs * t));

        points.push({
            latitude: lat + noiseLat,
            longitude: lng + noiseLng,
            timestamp: timestamp.toISOString(),
            source: "manual_entry"
        });
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/api/locations/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(points)
        });

        if (!response.ok) throw new Error('Failed to save trip');
        const res = await response.json();
        alert(`Trip Created Successfully! (${res.message})`);

    } catch (e) {
        console.error(e);
        alert('Error saving trip: ' + e.message);
    }
}
