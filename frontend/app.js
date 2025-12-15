// Replace with your actual Mapbox access token
const mapboxToken = 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbHQyYjN4YnIwMDBqMm10Z3Z4ZmoxZm54In0.replace_with_yours';
mapboxgl.accessToken = mapboxToken;

if (mapboxToken.includes('replace_with_yours')) {
    alert('CRITICAL: You must set your Mapbox Access Token in frontend/app.js for the map to work.\n\nThe screen will look empty (or black/blue) until you do this!');
}

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    projection: 'globe',
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

map.on('style.load', () => {
    map.setFog({
        'color': 'rgb(186, 210, 235)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)',
        'star-intensity': 0.6
    });
});

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
    map.flyTo({ center: lastLoc, zoom: 9, speed: 1.5 });
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
        // If at end, restart
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
    // Simple speed: advance by 10 points per frame (adjust as needed)
    // For smoother time-based animation, we'd calculate based on delta time, 
    // but index-based is easier for "replaying history" without waiting through long gaps.
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

    // Create a path: Tokyo -> Mt Fuji -> Nagoya -> Kyoto -> Osaka
    const waypoints = [
        { lat: 35.6895, lng: 139.6917, name: "Tokyo" },
        { lat: 35.3606, lng: 138.7274, name: "Mt Fuji" },
        { lat: 35.1815, lng: 136.9066, name: "Nagoya" },
        { lat: 35.0116, lng: 135.7681, name: "Kyoto" },
        { lat: 34.6937, lng: 135.5023, name: "Osaka" }
    ];

    const demoLocations = [];
    const startTime = new Date().getTime();
    const speed = 0.05; // Interpolation steps

    for (let i = 0; i < waypoints.length - 1; i++) {
        const start = waypoints[i];
        const end = waypoints[i + 1];
        const steps = 50;

        for (let j = 0; j <= steps; j++) {
            const t = j / steps;
            const lat = start.lat + (end.lat - start.lat) * t;
            const lng = start.lng + (end.lng - start.lng) * t;
            // Add some noise/curve
            const noise = Math.sin(t * Math.PI) * 0.05;

            // Fake timestamp: 1 hour per step
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

    // Reset Slider
    initializeMapData();

    // Auto play
    setTimeout(() => {
        if (!isPlaying) playBtn.click();
    }, 1000);
}

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    uploadBtn.innerText = 'Uploading...';
    uploadBtn.disabled = true;

    try {
        const response = await fetch('http://127.0.0.1:8000/api/upload/', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const result = await response.json();
        alert(result.message);

        // Reload data
        loadData();

    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed: ' + error.message);
    } finally {
        uploadBtn.innerText = 'Upload Data';
        uploadBtn.disabled = false;
        fileInput.value = ''; // Reset
    }
});
