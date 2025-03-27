// Game state variables
let game = {
    scene: null,
    camera: null,
    renderer: null,
    ship: null,
    track: null,
    obstacles: [],
    boosts: [],
    players: {},
    playerName: '',
    racing: false,
    startTime: 0,
    elapsedTime: 0,
    speed: 0,
    maxSpeed: 2.5,
    acceleration: 0.02,
    deceleration: 0.008,
    turnSpeed: 0.03,
    driftFactor: 0.92,
    boostAmount: 0,
    maxBoost: 100,
    boostSpeed: 4,
    boostDecay: 0.5,
    lap: 0,
    totalLaps: 3,
    trackLength: 1000,
    trackWidth: 100,
    socket: null,
    id: null,
    cameraOffset: new THREE.Vector3(0, 3, -8),
    cameraFollowSpeed: 0.1,
    rotationSpeed: 0.05,
    turnSensitivity: 1.5,
    shipForward: new THREE.Vector3(0, 0, 1),
    velocity: new THREE.Vector3(0, 0, 0),
    friction: 0.98,
    trackProgress: 0,
    lastCheckpoint: 0,
    playerLane: null,
    shipColor: '#4fd1c5', // Default ship color
    multiplayer: false, // Multiplayer mode flag
    multiplayerPlayers: {}, // Store for multiplayer players
    isConnected: false, // Socket connection status
    connectionState: 'disconnected', // Connection state: 'disconnected', 'connecting', 'connected'
    inCountdown: false, // Flag to track if the game is in countdown
    pendingPlayerJoins: [], // Track players who tried to join during countdown
    checkpointsPassed: {}, // Track which checkpoints have been passed for the current lap
    requiredProgressForLap: true, // Flag to enforce full track progress for a lap
    touchControls: {  // Touch/mouse control state
        isPressed: false,
        startX: 0,
        currentX: 0,
        lastTapTime: 0,      // For double-tap detection
        doubleTapDelay: 300, // Max time between taps in ms
        isDoubleTapped: false // Flag for double-tap and hold for boost
    },
    portal: null, // Reference to the Vibeverse portal
    comingFromPortal: false, // Flag to track if player came from another game
    referrerUrl: '' // Store the URL of referring game
};

// DOM elements
const menuEl = document.getElementById('menu');
const hudEl = document.getElementById('hud');
const finishScreenEl = document.getElementById('finish-screen');
const playerNameInput = document.getElementById('player-name');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const positionValueEl = document.getElementById('position-value');
const speedValueEl = document.getElementById('speed-value');
const timerValueEl = document.getElementById('timer-value');
const leaderboardListEl = document.getElementById('leaderboard-list');
const finalPositionEl = document.getElementById('final-position');
const finalTimeEl = document.getElementById('final-time');
const boostMeterEl = document.getElementById('boost-meter');
const boostMeterFillEl = document.getElementById('boost-meter-fill');
const lapCountSelect = document.getElementById('lap-count');
const lapCounterEl = document.getElementById('lap-counter');
const leaderboardTabs = document.querySelectorAll('.tab');
const multiplayerToggle = document.getElementById('multiplayer-toggle');

// Controls state
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

// Initialize the game
function init() {
    // Check if player is coming from a portal
    const urlParams = new URLSearchParams(window.location.search);
    game.comingFromPortal = urlParams.get('portal') === 'true';
    game.referrerUrl = urlParams.get('ref') || '';
    
    // Get player info from URL if coming from portal
    if (game.comingFromPortal) {
        const username = urlParams.get('username') || 'Player';
        const color = urlParams.get('color') || '#4fd1c5';
        
        // Pre-fill player name and color
        document.getElementById('player-name').value = username;
        game.shipColor = color;
        
        // Auto-start game if coming from portal
        setTimeout(() => {
            startRace();
        }, 100);
    }
    
    // Create scene
    game.scene = new THREE.Scene();
    game.scene.background = new THREE.Color(0x000011);
    
    // Create camera
    game.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    game.camera.position.set(0, 10, -15);
    game.camera.lookAt(0, 0, 0);
    
    // Create renderer
    game.renderer = new THREE.WebGLRenderer({ antialias: true });
    game.renderer.setSize(window.innerWidth, window.innerHeight);
    game.renderer.setPixelRatio(window.devicePixelRatio);
    game.renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(game.renderer.domElement);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x333333);
    game.scene.add(ambientLight);
    
    // Add directional light (for shadows)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    
    // Increase shadow frustum size
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    game.scene.add(directionalLight);
    
    // Create star background
    createStarBackground();
    
    // Set up leaderboard tabs
    setupLeaderboardTabs();
    
    // Set up color selection
    setupColorSelection();
    
    // Load leaderboard on startup
    loadLeaderboard(3);
    
    // Initialize the connection status display
    updateConnectionStatus();
    
    // Attach event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    startButton.addEventListener('click', startRace);
    restartButton.addEventListener('click', restartRace);
    
    // Add event listener for multiplayer toggle
    multiplayerToggle.addEventListener('change', function() {
        game.multiplayer = this.checked;
        updateConnectionStatus();
    });
    
    // Add touch/mouse controls
    const gameContainer = document.getElementById('game-container');
    gameContainer.addEventListener('mousedown', handleTouchStart);
    gameContainer.addEventListener('mousemove', handleTouchMove);
    gameContainer.addEventListener('mouseup', handleTouchEnd);
    gameContainer.addEventListener('mouseleave', handleTouchEnd);
    
    // Touch events for mobile
    gameContainer.addEventListener('touchstart', handleTouchStart);
    gameContainer.addEventListener('touchmove', handleTouchMove);
    gameContainer.addEventListener('touchend', handleTouchEnd);
    gameContainer.addEventListener('touchcancel', handleTouchEnd);
    
    // Start animation loop
    animate();
}

// Setup leaderboard tabs
function setupLeaderboardTabs() {
    leaderboardTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            leaderboardTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Load appropriate leaderboard
            const lapCount = parseInt(tab.dataset.laps);
            loadLeaderboard(lapCount);
        });
    });
}

// Setup color selection functionality
function setupColorSelection() {
    const colorOptions = document.querySelectorAll('.color-option');
    const customColorInput = document.getElementById('custom-color');
    
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            colorOptions.forEach(o => o.classList.remove('selected'));
            
            // Add selected class to clicked option
            option.classList.add('selected');
            
            // Get color from data attribute or color picker
            if (option.classList.contains('gradient-picker')) {
                game.shipColor = customColorInput.value;
            } else {
                game.shipColor = option.dataset.color;
            }
            
            // Update the start button color to match selection
            startButton.style.backgroundColor = game.shipColor;
        });
    });
    
    // Handle color picker changes
    customColorInput.addEventListener('input', (e) => {
        // Update the selected color
        game.shipColor = e.target.value;
        
        // Update selected state
        colorOptions.forEach(o => o.classList.remove('selected'));
        customColorInput.closest('.color-option').classList.add('selected');
        
        // Update the start button color
        startButton.style.backgroundColor = game.shipColor;
    });
    
    // Handle color picker click
    customColorInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Create a starry background
function createStarBackground() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
    const starPositions = [];
    
    for (let i = 0; i < starCount; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starPositions.push(x, y, z);
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1
    });
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    game.scene.add(stars);
}

// Create player ship
function createShip() {
    // Ship parent object for better control
    game.ship = new THREE.Group();
    game.ship.position.set(0, 1, 0);
    game.scene.add(game.ship);
    
    // Simple ship geometry (matching AI ships)
    const shipGeometry = new THREE.ConeGeometry(1, 4, 4);
    
    // Use the selected color for the ship
    const shipColor = new THREE.Color(game.shipColor);
    const shipMaterial = new THREE.MeshPhongMaterial({ 
        color: shipColor,
        flatShading: true
    });
    
    const shipBody = new THREE.Mesh(shipGeometry, shipMaterial);
    shipBody.rotation.x = Math.PI / 2;
    game.ship.add(shipBody);
    
    // Initialize velocity
    game.velocity = new THREE.Vector3(0, 0, 0);
}

// Generate procedural race track
function generateTrack() {
    // Track parameters
    const trackRadius = game.trackLength / (2 * Math.PI);
    const trackSegments = 64;
    
    // Add the red planet at the center
    createRedPlanet(trackRadius);
    
    // Add the Vibeverse portal outside the track
    createVibeVersePortal(trackRadius);
    
    // Create track curve (circle for simplicity)
    const curve = new THREE.EllipseCurve(
        0, 0,                         // Center
        trackRadius, trackRadius,     // X and Y radius
        0, 2 * Math.PI,               // Start and end angles
        false,                        // Clockwise
        0                             // Rotation
    );
    
    const points = curve.getPoints(trackSegments);
    const trackGeometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Material for track visualization
    const trackMaterial = new THREE.LineBasicMaterial({ color: 0x4fd1c5, linewidth: 5 });
    const trackLine = new THREE.Line(trackGeometry, trackMaterial);
    trackLine.rotation.x = Math.PI / 2;
    game.scene.add(trackLine);
    
    // Store track data
    game.track = {
        curve: curve,
        radius: trackRadius,
        line: trackLine
    };
    
    // Add track surface
    const trackSurfaceGeometry = new THREE.RingGeometry(
        trackRadius - game.trackWidth / 2,
        trackRadius + game.trackWidth / 2,
        trackSegments,
        1
    );
    
    // Create more interesting track material
    const trackSurfaceMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.8,
        metalness: 0.2,
        transparent: true,
        opacity: 0.9
    });
    
    const trackSurface = new THREE.Mesh(trackSurfaceGeometry, trackSurfaceMaterial);
    trackSurface.rotation.x = -Math.PI / 2;
    trackSurface.position.y = -0.1;
    game.scene.add(trackSurface);
    
    // Add track lanes
    addTrackLanes(trackRadius, trackSegments);
    
    // Add track boundaries
    createTrackBoundaries(trackRadius, trackSegments);
    
    // Add starting line
    addStartingLine(trackRadius);
    
    // Generate obstacles and boost items
    generateObstacles(trackRadius, trackSegments);
    generateBoostItems(trackRadius, trackSegments);
    
    // Add nebula particles around the track
    addNebulaParticles(trackRadius * 2);
}

// Add lanes to the track
function addTrackLanes(radius, segments) {
    // Create 4 lane markings
    for (let i = 1; i <= 3; i++) {
        const laneRadius = radius - game.trackWidth / 2 + (game.trackWidth / 4) * i;
        
        const points = [];
        for (let j = 0; j <= segments; j++) {
            // Skip every other point to create dashed lines
            if (j % 2 === 0) {
                continue;
            }
            
            const angle = (j / segments) * Math.PI * 2;
            const x = laneRadius * Math.cos(angle);
            const z = laneRadius * Math.sin(angle);
            points.push(new THREE.Vector3(x, 0.01, z));
            
            // Add a small gap
            const angleEnd = ((j + 0.5) / segments) * Math.PI * 2;
            const xEnd = laneRadius * Math.cos(angleEnd);
            const zEnd = laneRadius * Math.sin(angleEnd);
            points.push(new THREE.Vector3(xEnd, 0.01, zEnd));
        }
        
        const laneGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const laneMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.3
        });
        
        const lane = new THREE.LineSegments(laneGeometry, laneMaterial);
        game.scene.add(lane);
    }
}

// Add starting line to the track
function addStartingLine(radius) {
    const innerRadius = radius - game.trackWidth / 2;
    const outerRadius = radius + game.trackWidth / 2;
    
    const startLineGeometry = new THREE.BufferGeometry();
    const vertices = [
        new THREE.Vector3(innerRadius, 0.05, 0),
        new THREE.Vector3(outerRadius, 0.05, 0)
    ];
    
    startLineGeometry.setFromPoints(vertices);
    
    const startLineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        linewidth: 5
    });
    
    const startLine = new THREE.Line(startLineGeometry, startLineMaterial);
    game.scene.add(startLine);
    
    // Add checkered pattern
    const checkerSize = game.trackWidth / 20;
    const checkerCount = Math.floor(game.trackWidth / checkerSize);
    
    for (let i = 0; i < checkerCount; i++) {
        // Skip every other square for checkered pattern
        if (i % 2 === 0) {
            continue;
        }
        
        const checkerGeometry = new THREE.PlaneGeometry(checkerSize, checkerSize);
        const checkerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const checker = new THREE.Mesh(checkerGeometry, checkerMaterial);
        
        checker.rotation.x = -Math.PI / 2;
        checker.position.x = innerRadius + i * checkerSize + checkerSize / 2;
        checker.position.y = 0.05;
        
        game.scene.add(checker);
    }
}

// Add nebula particles around the track
function addNebulaParticles(radius) {
    const particleCount = 2000;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = [];
    const particleColors = [];
    
    // Colors for the nebula
    const nebulaColors = [
        new THREE.Color(0x4fd1c5), // Teal
        new THREE.Color(0x9f7aea), // Purple
        new THREE.Color(0xf687b3), // Pink
        new THREE.Color(0x2c7a7b)  // Dark teal
    ];
    
    for (let i = 0; i < particleCount; i++) {
        // Create a ring of particles around the track
        const angle = Math.random() * Math.PI * 2;
        const distance = radius * 0.8 + (Math.random() * radius * 1.2);
        
        const x = Math.cos(angle) * distance;
        const y = (Math.random() - 0.5) * 100;
        const z = Math.sin(angle) * distance;
        
        particlePositions.push(x, y, z);
        
        // Assign random colors
        const color = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
        particleColors.push(color.r, color.g, color.b);
    }
    
    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(particleColors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    game.scene.add(particles);
    
    // Store reference for animation
    game.nebula = particles;
}

// Create track boundaries
function createTrackBoundaries(radius, segments) {
    const innerRadius = radius - game.trackWidth / 2;
    const outerRadius = radius + game.trackWidth / 2;
    
    // Inner boundary
    createTrackBoundary(innerRadius, segments, 0xff0000);
    
    // Outer boundary
    createTrackBoundary(outerRadius, segments, 0xff0000);
}

// Create a single track boundary
function createTrackBoundary(radius, segments, color) {
    const points = [];
    
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        points.push(new THREE.Vector3(x, 0, z));
    }
    
    const boundaryGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const boundaryMaterial = new THREE.LineBasicMaterial({ color: color });
    const boundary = new THREE.Line(boundaryGeometry, boundaryMaterial);
    game.scene.add(boundary);
}

// Generate obstacles
function generateObstacles(trackRadius, trackSegments) {
    const obstacleCount = 20;
    const safeAngle = 0.3; // Safe zone around starting point (radians)
    
    for (let i = 0; i < obstacleCount; i++) {
        const angle = (i / obstacleCount) * Math.PI * 2;
        
        // Skip obstacles near the starting point
        if (Math.abs(angle) < safeAngle || Math.abs(angle - 2 * Math.PI) < safeAngle) {
            continue;
        }
        
        // Random offset within track width
        const radiusOffset = (Math.random() - 0.5) * 0.7 * game.trackWidth;
        const adjustedRadius = trackRadius + radiusOffset;
        
        const x = adjustedRadius * Math.cos(angle);
        const z = adjustedRadius * Math.sin(angle);
        
        createObstacle(x, z);
    }
}

// Create a single obstacle
function createObstacle(x, z) {
    const size = 2 + Math.random() * 3;
    const geometry = new THREE.IcosahedronGeometry(size, 0);
    const material = new THREE.MeshStandardMaterial({
        color: 0xff3333,
        roughness: 0.7,
        metalness: 0.3
    });
    
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.set(x, size / 2, z);
    game.scene.add(obstacle);
    
    // Store obstacle data for collision detection
    game.obstacles.push({
        mesh: obstacle,
        radius: size,
        position: new THREE.Vector2(x, z)
    });
}

// Generate boost items
function generateBoostItems(trackRadius, trackSegments) {
    const boostCount = 10;
    
    for (let i = 0; i < boostCount; i++) {
        const angle = (i / boostCount) * Math.PI * 2;
        
        // Random offset within track width
        const radiusOffset = (Math.random() - 0.5) * 0.7 * game.trackWidth;
        const adjustedRadius = trackRadius + radiusOffset;
        
        const x = adjustedRadius * Math.cos(angle);
        const z = adjustedRadius * Math.sin(angle);
        
        createBoostItem(x, z);
    }
}

// Create a single boost item
function createBoostItem(x, z) {
    const geometry = new THREE.OctahedronGeometry(1.5, 0);
    const material = new THREE.MeshStandardMaterial({
        color: 0x4fd1c5,
        emissive: 0x4fd1c5,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
    });
    
    const boost = new THREE.Mesh(geometry, material);
    boost.position.set(x, 1.5, z);
    game.scene.add(boost);
    
    // Add rotation animation
    boost.userData.rotationSpeed = 0.02;
    boost.userData.bounceSpeed = 0.02;
    boost.userData.bounceHeight = 0.5;
    boost.userData.initialY = 1.5;
    boost.userData.time = Math.random() * Math.PI * 2;
    boost.userData.active = true;
    
    // Store boost data for collision detection
    game.boosts.push({
        mesh: boost,
        radius: 1.5,
        position: new THREE.Vector2(x, z)
    });
}

// Start the race
function startRace() {
    game.playerName = playerNameInput.value.trim() || 'Player';
    
    // Get selected lap count
    const selectedLapCount = parseInt(lapCountSelect.value);
    game.totalLaps = isNaN(selectedLapCount) ? 3 : selectedLapCount; // Default to 3 if invalid
    
    game.racing = true;
    game.startTime = Date.now();
    game.lap = 0; // Reset lap counter
    
    // Update connection status for in-race display
    updateConnectionStatus();
    
    // Hide menu, show HUD
    menuEl.classList.add('hidden');
    hudEl.classList.remove('hidden');
    
    // Hide multiplayer toggle during race, but keep connection status visible
    document.getElementById('multiplayer-selection').classList.add('hidden');
    
    // Hide Vibe Jam badge during race
    const vibeJamBadge = document.getElementById('vibe-jam-badge');
    if (vibeJamBadge) {
        vibeJamBadge.style.display = 'none';
    }
    
    // Setup game elements
    createShip();
    generateTrack();
    
    // Position ship at starting point
    positionShipAtStart();
    
    // Start countdown
    startCountdown();
    
    // Connect to server if multiplayer is enabled
    if (game.multiplayer && !game.socket) {
        setupMultiplayer();
    }
    
    // Always simulate AI players (even in multiplayer mode)
    simulateOtherPlayers();
}

// Position ship at start line
function positionShipAtStart() {
    // Calculate lane width within the track
    const laneWidth = game.trackWidth / 8; // 8 total racers (7 AI + player)
    
    // Randomly place player in any lane (1-8)
    const playerLane = Math.floor(Math.random() * 8) + 1;
    
    // Calculate radial offset for player's lane (from center of track)
    // Adjust calculation to ensure player starts within track boundaries
    // Lane 1 is inner edge, Lane 8 is outer edge
    const innerRadius = game.track.radius - game.trackWidth / 2; // Inner track edge
    const radialOffset = innerRadius + (playerLane - 0.5) * laneWidth;
    
    // Get the start position (point 0 on the track curve)
    const startPoint = game.track.curve.getPoint(0);
    
    // Get the tangent at the starting point
    const tangent = game.track.curve.getTangent(0);
    
    // Calculate direction vector from center to start point (for proper radial positioning)
    const centerToEdge = new THREE.Vector2(startPoint.x, startPoint.y).normalize();
    
    // Position ship at start line with lane offset
    game.ship.position.set(
        centerToEdge.x * radialOffset, 
        1, 
        centerToEdge.y * radialOffset
    );
    
    // Set rotation to face the tangent direction
    const angle = Math.atan2(tangent.y, tangent.x);
    game.ship.rotation.y = angle - Math.PI / 2;
    
    // Reset physics
    game.velocity = new THREE.Vector3(0, 0, 0);
    game.shipForward = new THREE.Vector3(0, 0, 1).applyQuaternion(game.ship.quaternion);
    game.speed = 0;
    game.boostAmount = 100;
    
    // Ensure boost effect is properly created
    if (game.boostEffectGroup) {
        game.ship.remove(game.boostEffectGroup);
        game.boostEffectGroup = null;
        game.boostParticles = null;
    }
    
    // Create a new boost effect for the new race
    createBoostEffect();
    
    // Initialize lap tracking
    game.lap = 0;
    game.trackProgress = 0;
    game.lastCheckpoint = 0;
    
    // Reset checkpoint tracking system
    game.checkpointsPassed = {}; 
    
    // Initialize checkpoints for first lap
    const checkpointCount = 8;
    game.checkpointsPassed[0] = new Array(checkpointCount).fill(false);
    game.checkpointsPassed[0][0] = true; // Mark starting checkpoint as passed
    
    // Store player's lane
    game.playerLane = playerLane;
    
    // Immediately set camera to proper starting position behind ship
    const cameraOffset = new THREE.Vector3(0, game.cameraOffset.y, game.cameraOffset.z);
    cameraOffset.applyQuaternion(game.ship.quaternion);
    game.camera.position.copy(game.ship.position.clone().add(cameraOffset));
}

// Start countdown before race begins
function startCountdown() {
    // Create countdown overlay
    const countdownOverlay = document.createElement('div');
    countdownOverlay.className = 'countdown-overlay';
    document.body.appendChild(countdownOverlay);
    
    let count = 3;
    
    // Disable controls during countdown
    game.racing = false;
    // Set countdown flag
    game.inCountdown = true;
    
    // Hide all HUD elements during countdown
    const hudElements = hudEl.querySelectorAll('.hud-element, .hud-label');
    hudElements.forEach(el => {
        el.style.visibility = 'hidden';
    });
    
    // Ensure camera is properly positioned during countdown
    updateCamera();
    
    const countdownInterval = setInterval(() => {
        // Update camera during countdown too
        updateCamera();
        
        if (count > 0) {
            countdownOverlay.textContent = count;
            count--;
        } else if (count === 0) {
            countdownOverlay.textContent = 'GO!';
            count--;
        } else {
            clearInterval(countdownInterval);
            countdownOverlay.remove();
            
            // Show all HUD elements when race actually starts
            hudElements.forEach(el => {
                el.style.visibility = 'visible';
            });
            
            // Start the race and reset the timer
            game.racing = true;
            game.startTime = Date.now(); // Crucial: reset the start time right when race begins
            game.elapsedTime = 0;
            timerValueEl.textContent = formatTime(0);
            
            // Clear countdown flag
            game.inCountdown = false;
            
            // Process any pending player joins that occurred during countdown
            if (game.pendingPlayerJoins.length > 0 && game.multiplayer && game.isConnected) {
                showNotification('New player(s) joined! Race reset.');
                resetRaceToStart();
                game.pendingPlayerJoins = []; // Clear pending joins
            }
        }
    }, 1000);
}

// Simulate other racers for single player mode
function simulateOtherPlayers() {
    const playerCount = 7; // 7 AI + 1 player = 8 racers
    
    // Calculate lane width within the track
    const laneWidth = game.trackWidth / 8; // 8 total racers (7 AI + player)
    
    // Create an array of all available lanes (1-8)
    const availableLanes = [1, 2, 3, 4, 5, 6, 7, 8];
    
    // Custom AI names
    const aiNames = ["Celestial1", "Nova2", "Voyager3", "Orion4", "Galileo5", "Aether6", "Cosmos7"];
    
    // Remove player's lane from available lanes to avoid spawning AI there
    if (game.playerLane) {
        const playerLaneIndex = availableLanes.indexOf(game.playerLane);
        if (playerLaneIndex !== -1) {
            availableLanes.splice(playerLaneIndex, 1);
        }
    }
    
    for (let i = 0; i < playerCount; i++) {
        const id = 'ai-' + i;
        // Create AI ship as a group for better control
        const shipGroup = new THREE.Group();
        
        const shipGeometry = new THREE.ConeGeometry(1, 4, 4);
        // Generate a random color for this AI ship
        const shipColor = Math.random() * 0xffffff;
        const shipMaterial = new THREE.MeshPhongMaterial({ 
            color: shipColor,
            flatShading: true
        });
        
        const ship = new THREE.Mesh(shipGeometry, shipMaterial);
        // Rotate ship to face forward instead of upward
        ship.rotation.x = Math.PI / 2;
        shipGroup.add(ship);
        
        // Create name sprite for AI
        const aiName = aiNames[i];
        const nameSprite = createPlayerNameSprite(aiName, '#' + shipColor.toString(16).padStart(6, '0'));
        nameSprite.position.set(0, 3, 0); // Position higher above the ship (changed from 2 to 3)
        shipGroup.add(nameSprite);
        
        // All racers start at progress 0 (starting line)
        const startProgress = 0;
        
        // Randomly select a lane from available lanes
        const randomIndex = Math.floor(Math.random() * availableLanes.length);
        const laneIndex = availableLanes[randomIndex];
        
        // Remove this lane from available lanes to avoid duplicates
        availableLanes.splice(randomIndex, 1);
        
        // If we've run out of available lanes, just use a random one (unlikely since we only have 7 AI)
        if (availableLanes.length === 0) {
            // Exclude player lane if possible
            const excludePlayerLane = (laneIndex) => laneIndex !== game.playerLane;
            const possibleLanes = [1, 2, 3, 4, 5, 6, 7, 8].filter(excludePlayerLane);
            availableLanes.push(...possibleLanes);
        }
        
        // Calculate proper radial offset to ensure AI ships stay on track
        const innerRadius = game.track.radius - game.trackWidth / 2; // Inner track edge
        const radialOffset = innerRadius + (laneIndex - 0.5) * laneWidth;
        
        // Get the point on the center of the track
        const startPoint = game.track.curve.getPoint(startProgress);
        
        // Calculate direction vector from center to start point
        const centerToEdge = new THREE.Vector2(startPoint.x, startPoint.y).normalize();
        
        // Set position with proper radial offset
        shipGroup.position.set(
            centerToEdge.x * radialOffset, 
            1, 
            centerToEdge.y * radialOffset
        );
        
        // Get the tangent to set the starting direction
        const tangent = game.track.curve.getTangent(startProgress);
        
        // Make direction vector positive to face forward along track
        const direction = new THREE.Vector3(tangent.x, 0, tangent.y);
        direction.normalize();
        
        // Set the initial orientation using lookAt
        const target = new THREE.Vector3(
            shipGroup.position.x + direction.x,
            shipGroup.position.y,
            shipGroup.position.z + direction.z
        );
        shipGroup.lookAt(target);
        
        // Create boost effect for AI ships
        const aiBoostEffect = createAIBoostEffect();
        // Update boost effect color to match ship color
        if (aiBoostEffect.children.length >= 2) {
            // Update core color
            aiBoostEffect.children[0].material.color.setHex(shipColor);
            // Update particles color
            aiBoostEffect.children[1].material.color.setHex(shipColor);
        }
        shipGroup.add(aiBoostEffect);
        aiBoostEffect.visible = false;
        
        game.scene.add(shipGroup);
        
        // Store AI player data - speed increases for ships further back
        // Increase AI base speed by 25%
        const baseSpeed = (0.4 + (i * 0.05)) * 1.25;
        game.players[id] = {
            mesh: shipGroup,
            name: aiNames[i],
            progress: startProgress,
            speed: baseSpeed,
            lap: 0,
            lastProgress: startProgress,
            boostAmount: 100, // Initialize AI boost meter
            maxBoost: 100,
            boosting: false,
            boostEffect: aiBoostEffect,
            boostCooldown: 0,
            boostProbability: 0.002 + (Math.random() * 0.003), // Random boost probability
            lane: laneIndex, // Store the lane assignment
            shipColor: shipColor // Store the ship color for boost effects
        };
    }
}

// Create a boost effect for AI ships
function createAIBoostEffect() {
    const boostGroup = new THREE.Group();
    
    // Create simple core
    const coreGeometry = new THREE.SphereGeometry(0.6, 8, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0x4fd1c5, // This will be updated to match the AI ship color
        transparent: true,
        opacity: 0.8
    });
    
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.z = -2;
    boostGroup.add(core);
    
    // Add particles
    const particleCount = 20;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    // Initialize particles in a cone shape
    for (let i = 0; i < particleCount; i++) {
        const distance = -2 - (i / particleCount) * 4;
        const angle = i % 6 * (Math.PI * 2 / 6);
        const radius = Math.abs(distance) * 0.15;
        
        particlePositions[i * 3] = Math.cos(angle) * radius;
        particlePositions[i * 3 + 1] = Math.sin(angle) * radius;
        particlePositions[i * 3 + 2] = distance;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x4fd1c5, // This will be updated to match the AI ship color
        size: 0.6,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    boostGroup.add(particles);
    
    return boostGroup;
}

// Restart the race
function restartRace() {
    // Reset game state
    game.racing = false;
    game.lap = 0;
    game.speed = 0;
    game.boostAmount = 0;
    
    // Disconnect from the server if we're in multiplayer mode
    if (game.multiplayer && game.isConnected) {
        disconnectFromServer();
    }
    
    // Update connection status for menu display
    updateConnectionStatus();
    
    // Remove existing game objects
    if (game.ship) {
        game.scene.remove(game.ship);
    }
    
    if (game.track && game.track.line) {
        game.scene.remove(game.track.line);
    }
    
    // Remove obstacles and boosts
    for (const obstacle of game.obstacles) {
        game.scene.remove(obstacle.mesh);
    }
    
    for (const boost of game.boosts) {
        game.scene.remove(boost.mesh);
    }
    
    // Remove AI players
    for (const id in game.players) {
        game.scene.remove(game.players[id].mesh);
    }
    
    // Reset planet rotation if it exists
    if (game.planet) {
        game.scene.remove(game.planet);
        game.planet = null; // This will force it to be recreated
    }
    
    // Reset boost particles
    if (game.boostParticles && game.boostParticles.userData) {
        game.boostParticles.userData.time = 0;
    }
    
    if (game.boostEffectGroup) {
        game.boostEffectGroup.visible = false;
    }
    
    // Clear arrays and objects
    game.obstacles = [];
    game.boosts = [];
    game.players = {};
    
    // Reset camera
    game.camera.position.set(0, 10, -15);
    game.camera.lookAt(0, 0, 0);
    
    // Show Vibe Jam badge when returning to menu
    const vibeJamBadge = document.getElementById('vibe-jam-badge');
    if (vibeJamBadge) {
        vibeJamBadge.style.display = 'block';
    }
    
    // Hide finish screen, show menu and multiplayer toggle
    finishScreenEl.classList.add('hidden');
    menuEl.classList.remove('hidden');
    document.getElementById('multiplayer-selection').classList.remove('hidden');
}

// Handle key down events
function handleKeyDown(event) {
    // Map spacebar key
    if (event.code === 'Space') {
        keys.Space = true;
        event.preventDefault();
        return;
    }
    
    if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = true;
        event.preventDefault();
    }
}

// Handle key up events
function handleKeyUp(event) {
    // Map spacebar key
    if (event.code === 'Space') {
        keys.Space = false;
        event.preventDefault();
        return;
    }
    
    if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = false;
    }
}

// Update ship movement based on input
function updateShipMovement() {
    if (!game.racing || !game.ship) return;
    
    // Store old position for collision resolution
    const oldPosition = game.ship.position.clone();
    
    // Apply acceleration/deceleration to velocity
    if (keys.ArrowUp) {
        // Forward acceleration in the direction the ship is facing
        const forwardDir = new THREE.Vector3(0, 0, 1);
        forwardDir.applyQuaternion(game.ship.quaternion);
        forwardDir.normalize();
        forwardDir.multiplyScalar(game.acceleration);
        game.velocity.add(forwardDir);
    } else if (keys.ArrowDown) {
        // Brake/reverse
        game.velocity.multiplyScalar(0.95);
    }
    
    // Apply friction
    game.velocity.multiplyScalar(game.friction);
    
    // Calculate current speed
    game.speed = game.velocity.length();
    
    // Apply boost
    if (keys.Space && game.boostAmount > 0) {
        // Apply boost speed in direction ship is facing
        const boostDir = new THREE.Vector3(0, 0, 1);
        boostDir.applyQuaternion(game.ship.quaternion);
        boostDir.normalize();
        boostDir.multiplyScalar(0.1);
        game.velocity.add(boostDir);
        
        // Limit max speed
        if (game.velocity.length() > game.boostSpeed) {
            game.velocity.normalize();
            game.velocity.multiplyScalar(game.boostSpeed);
        }
        
        // Reduce boost meter
        game.boostAmount -= game.boostDecay;
        updateBoostMeter();
        
        // Update boost visual effect
        if (!game.boostEffectGroup) {
            createBoostEffect();
        }
        
        // Show boost effect
        game.boostEffectGroup.visible = true;
        
        // Scale boost effect by remaining boost amount
        const boostScale = 0.5 + (game.boostAmount / game.maxBoost) * 0.5;
        game.boostEffectGroup.scale.set(boostScale, boostScale, boostScale);
    } else {
        // Hide boost effect when not boosting
        if (game.boostEffectGroup) {
            game.boostEffectGroup.visible = false;
        }
        
        // Normal speed cap
        if (game.velocity.length() > game.maxSpeed) {
            game.velocity.normalize();
            game.velocity.multiplyScalar(game.maxSpeed);
        }
    }
    
    // Apply turning - fixed to be more responsive and speed dependent
    if (keys.ArrowLeft) {
        // Turn ship and update its rotation - faster turning at higher speeds
        const turnFactor = 0.5 + (game.speed / game.maxSpeed) * 0.5;
        game.ship.rotation.y += game.rotationSpeed * game.turnSensitivity * turnFactor;
    } else if (keys.ArrowRight) {
        const turnFactor = 0.5 + (game.speed / game.maxSpeed) * 0.5;
        game.ship.rotation.y -= game.rotationSpeed * game.turnSensitivity * turnFactor;
    }
    
    // Update ship position based on velocity
    game.ship.position.add(game.velocity);
    
    // Update HUD
    updateHUD();
    
    // Check collisions
    if (checkCollisions()) {
        // If collision occurred, restore position and reduce velocity
        game.ship.position.copy(oldPosition);
        game.velocity.multiplyScalar(0.5);
    }
    
    // Check track boundaries
    if (checkTrackBoundaries()) {
        // If off track, reduce speed
        game.velocity.multiplyScalar(0.95);
    }
    
    // Check lap completion
    checkLapCompletion();
    
    // Update camera position to follow ship
    updateCamera();
    
    // Tilt the ship based on turning and speed
    let tiltAmount = 0;
    if (keys.ArrowLeft) {
        tiltAmount = 0.2 * (game.speed / game.maxSpeed);
    } else if (keys.ArrowRight) {
        tiltAmount = -0.2 * (game.speed / game.maxSpeed);
    }
    
    // Apply smooth tilt
    game.ship.rotation.z = THREE.MathUtils.lerp(game.ship.rotation.z, tiltAmount, 0.1);
}

// Update AI players with improved behavior and orientation
function updateAIPlayers() {
    if (!game.racing) return;
    
    // Calculate lane width within the track
    const laneWidth = game.trackWidth / 8; // 8 total racers (7 AI + player)
    
    for (const id in game.players) {
        const player = game.players[id];
        
        // Store previous position for collision resolution
        const prevPosition = player.mesh.position.clone();
        
        // Manage AI boost
        updateAIBoost(player, id);
        
        // Add some randomness to AI speed (reduced variance)
        const speedVariance = Math.sin(Date.now() * 0.001 + parseInt(id.split('-')[1])) * 0.1;
        let adjustedSpeed = player.speed + speedVariance;
        
        // Apply boost if active
        if (player.boosting && player.boostAmount > 0) {
            adjustedSpeed *= 1.5; // 50% speed increase when boosting
            player.boostAmount -= 0.5; // Deplete boost
            
            // Show boost effect
            if (player.boostEffect) {
                player.boostEffect.visible = true;
            }
            
            // Stop boosting if out of boost
            if (player.boostAmount <= 0) {
                player.boosting = false;
                if (player.boostEffect) {
                    player.boostEffect.visible = false;
                }
                player.boostCooldown = 100; // Set cooldown before next boost
            }
        } else {
            // Hide boost effect
            if (player.boostEffect) {
                player.boostEffect.visible = false;
            }
            
            // Regenerate boost when not boosting (slower than player)
            if (player.boostAmount < player.maxBoost && !player.boosting) {
                player.boostAmount += 0.1;
            }
            
            // Decrease boost cooldown
            if (player.boostCooldown > 0) {
                player.boostCooldown--;
            }
        }
        
        // Calculate new progress
        const progressIncrement = adjustedSpeed * 0.001;
        const newProgress = player.progress + progressIncrement;
        
        // Handle lap completion with better accuracy
        if (newProgress >= 1) {
            // Only increment lap if we were in the last part of the track and are now crossing the line
            if (player.lastProgress > 0.85) { 
                player.lap++;
                console.log(`AI ${id} completed lap: ${player.lap}`);
            }
            player.progress = newProgress % 1;
        } else {
            player.progress = newProgress;
        }
        player.lastProgress = player.progress;
        
        // Get position on track with smoother variation
        const position = game.track.curve.getPoint(player.progress);
        const tangent = game.track.curve.getTangent(player.progress);
        
        // Create a direction vector in 3D space from the 2D tangent
        // Make direction vector positive to face forward along track
        const direction = new THREE.Vector3(tangent.x, 0, tangent.y);
        direction.normalize();
        
        // Make the ships face along the track (tangential orientation)
        // We use lookAt instead of direct rotation setting
        const target = new THREE.Vector3(
            player.mesh.position.x + direction.x,
            player.mesh.position.y,
            player.mesh.position.z + direction.z
        );
        
        player.mesh.lookAt(target);
        
        // Calculate lane radial offset (consistent with starting position)
        // Use the assigned lane for this AI ship
        const laneIndex = player.lane;
        
        // Calculate safe lane offset to prevent going off track
        // Reduce the effective range to keep AI ships within track bounds
        const safeTrackWidth = game.trackWidth * 0.85; // 85% of track width for safety
        const radialOffset = -safeTrackWidth/2 + (laneIndex * laneWidth) + (laneWidth/2);
        
        // Calculate normal vector (perpendicular to tangent)
        const normal = new THREE.Vector2(-tangent.y, tangent.x).normalize();
        
        // Apply radial offset in the normal direction to stay in lane
        const offsetX = normal.x * radialOffset;
        const offsetZ = normal.y * radialOffset;
        
        // Enhanced natural weaving behavior - each AI has unique pattern
        // 1. Use multiple sine waves with different frequencies
        // 2. Scale weaving based on speed
        // 3. Add unique phase for each AI
        
        // Get unique values for this AI
        const aiIndex = parseInt(id.split('-')[1]);
        const baseFreq = 0.0003 + (aiIndex * 0.00005); // Unique frequency for each AI
        const phase = aiIndex * Math.PI / 4; // Stagger phases
        
        // Scale weave amount based on speed and track progress (less weaving in curves)
        const speedFactor = 0.5 + (adjustedSpeed / game.maxSpeed); // More weaving at higher speeds
        const trackCurveFactor = Math.abs(Math.sin(player.progress * Math.PI * 2)); 
        const weaveScale = 0.25 - (trackCurveFactor * 0.15); // Reduce weaving in sharp curves
        
        // Multi-frequency weaving pattern
        const time = Date.now();
        const primaryWeave = Math.sin(time * baseFreq + phase) * laneWidth * weaveScale;
        const secondaryWeave = Math.sin(time * baseFreq * 2.7 + phase * 1.5) * laneWidth * weaveScale * 0.3;
        
        // Combine patterns for more natural movement
        const totalWeave = (primaryWeave + secondaryWeave) * speedFactor;
        
        // Apply weave to position along normal vector
        const weaveX = normal.x * totalWeave;
        const weaveZ = normal.y * totalWeave;
        
        // Also add subtle vertical bobbing
        const verticalBob = Math.sin(time * 0.002 + aiIndex) * 0.08 * speedFactor; 
        
        // Calculate new position
        const newPosition = new THREE.Vector3(
            position.x + offsetX + weaveX,
            1 + verticalBob, 
            position.y + offsetZ + weaveZ
        );
        
        // Check if the new position is within track boundaries
        const positionVec2 = new THREE.Vector2(newPosition.x, newPosition.z);
        const distanceFromCenter = positionVec2.length();
        
        const innerBoundary = game.track.radius - game.trackWidth / 2;
        const outerBoundary = game.track.radius + game.trackWidth / 2;
        
        // If position is outside track boundaries, adjust it
        if (distanceFromCenter < innerBoundary) {
            // Too close to center - move outward
            const centerToShip = positionVec2.clone().normalize();
            newPosition.x = centerToShip.x * (innerBoundary + 1);
            newPosition.z = centerToShip.y * (innerBoundary + 1);
        } else if (distanceFromCenter > outerBoundary) {
            // Too far from center - move inward
            const centerToShip = positionVec2.clone().normalize();
            newPosition.x = centerToShip.x * (outerBoundary - 1);
            newPosition.z = centerToShip.y * (outerBoundary - 1);
        }
        
        // Apply subtle ship tilt based on weaving direction (banking into turns)
        const tiltAmount = -totalWeave * 0.03; // Subtle tilt proportional to weave amount
        player.mesh.rotation.z = THREE.MathUtils.lerp(player.mesh.rotation.z, tiltAmount, 0.1);
        
        // Check for collisions with obstacles
        let collision = false;
        const aiPosition2D = new THREE.Vector2(newPosition.x, newPosition.z);
        
        // Check obstacle collisions for AI
        for (const obstacle of game.obstacles) {
            const distance = aiPosition2D.distanceTo(obstacle.position);
            if (distance < obstacle.radius + 1.5) {
                collision = true;
                break;
            }
        }
        
        // If collision detected, keep previous position and reduce speed
        if (collision) {
            player.mesh.position.copy(prevPosition);
            player.speed *= 0.8; // Reduce speed on collision
            player.boosting = false; // Stop boosting on collision
            if (player.boostEffect) {
                player.boostEffect.visible = false;
            }
        } else {
            // Update AI position if no collision
            player.mesh.position.copy(newPosition);
            // Gradually recover speed if below base speed
            // Increase AI recovery base speed by 25%
            const baseSpeed = (0.6 + (parseInt(id.split('-')[1]) * 0.05)) * 1.25;
            if (player.speed < baseSpeed) {
                player.speed = THREE.MathUtils.lerp(player.speed, baseSpeed, 0.1);
            }
        }
        
        // Check for boost item collection
        checkAIBoostCollection(player);
    }
}

// AI boost decision making
function updateAIBoost(player, id) {
    // Don't boost if on cooldown or already boosting
    if (player.boostCooldown > 0 || player.boosting) return;
    
    // Need enough boost to start
    if (player.boostAmount < 30) return;
    
    // Random boost chance based on race situation
    const randomBoost = Math.random() < player.boostProbability;
    
    // Tactical boost on straights (based on progress)
    const isStraight = Math.sin(player.progress * Math.PI * 2) < 0.3;
    
    // Boost when falling behind
    const position = getAIPosition(id);
    const fallingBehind = position > 4; // Boost if in bottom half of racers
    
    // Strategic final lap boost - make sure we use game.totalLaps
    const finalLapBoost = player.lap === game.totalLaps - 1 && player.progress > 0.5;
    
    // Decide to boost based on conditions
    if ((randomBoost && isStraight) || (fallingBehind && Math.random() < 0.1) || finalLapBoost) {
        player.boosting = true;
        // Random boost duration
        player.boostAmount = Math.max(30, player.boostAmount);
        
        // Ensure boost effect is using the correct ship color
        if (player.boostEffect && player.boostEffect.children.length >= 2) {
            // Update core color
            player.boostEffect.children[0].material.color.setHex(player.shipColor);
            // Update particles color
            player.boostEffect.children[1].material.color.setHex(player.shipColor);
        }
    }
}

// Get AI position in race for strategic decision making
function getAIPosition(aiId) {
    // Create an array of all racers (player + AI)
    const racers = [];
    
    // Add player
    racers.push({
        id: 'player',
        lap: game.lap,
        progress: game.trackProgress
    });
    
    // Add AI racers
    for (const id in game.players) {
        racers.push({
            id: id,
            lap: game.players[id].lap,
            progress: game.players[id].progress
        });
    }
    
    // Sort racers by position (lap first, then progress)
    racers.sort((a, b) => {
        // Compare laps first
        if (a.lap !== b.lap) {
            return b.lap - a.lap; // Higher lap = better position
        }
        // If same lap, compare progress
        return b.progress - a.progress; // Higher progress = better position
    });
    
    // Find AI position
    for (let i = 0; i < racers.length; i++) {
        if (racers[i].id === aiId) {
            return i + 1; // +1 because positions are 1-indexed
        }
    }
    
    return 8; // Default to last if not found
}

// Check if AI ships collect boost items
function checkAIBoostCollection(player) {
    const aiPosition2D = new THREE.Vector2(player.mesh.position.x, player.mesh.position.z);
    
    for (const boost of game.boosts) {
        if (!boost.mesh.userData.active) continue;
        
        const distance = aiPosition2D.distanceTo(boost.position);
        
        if (distance < boost.radius + 2) {
            // Collect boost item
            boost.mesh.userData.active = false;
            boost.mesh.visible = false;
            
            // Add boost to AI player
            player.boostAmount = Math.min(player.maxBoost, player.boostAmount + 30);
        }
    }
}

// Update camera position to follow ship
function updateCamera() {
    if (!game.ship) return;
    
    // Calculate ideal camera position behind the ship
    const offset = new THREE.Vector3(0, game.cameraOffset.y, game.cameraOffset.z);
    offset.applyQuaternion(game.ship.quaternion);
    
    const targetPosition = game.ship.position.clone().add(offset);
    
    // Smooth camera movement with speed-based adjustment
    const followSpeed = THREE.MathUtils.clamp(
        game.cameraFollowSpeed * (1 + game.speed / game.maxSpeed),
        0.1, 0.3
    );
    game.camera.position.lerp(targetPosition, followSpeed);
    
    // Make camera look at a point slightly ahead of the ship
    const lookAtOffset = new THREE.Vector3(0, 0.5, 3);
    lookAtOffset.applyQuaternion(game.ship.quaternion);
    const lookAtTarget = game.ship.position.clone().add(lookAtOffset);
    
    game.camera.lookAt(lookAtTarget);
}

// Check for collisions with obstacles and boost items
function checkCollisions() {
    if (!game.ship) return false;
    
    const shipPosition = new THREE.Vector2(
        game.ship.position.x,
        game.ship.position.z
    );
    
    let collisionOccurred = false;

    // Check portal collision
    if (game.portal && game.portal.mesh) {
        const portalPosition = new THREE.Vector2(
            game.portal.mesh.position.x,
            game.portal.mesh.position.z
        );
        const portalRadius = 5; // Portal hit radius
        
        const distanceToPortal = shipPosition.distanceTo(portalPosition);
        
        if (distanceToPortal < portalRadius) {
            // Handle portal entry - redirect to Vibeverse portal
            redirectToVibeVersePortal();
            return false; // Don't process other collisions
        }
    }
    
    // Check planet collision first
    if (game.planet) {
        // Create 2D position for planet (ignoring Y since it's centered)
        const planetPosition = new THREE.Vector2(0, 0); // Planet is at center
        const planetRadius = game.planet.geometry.parameters.radius;
        
        // Calculate distance from ship to planet center
        const distanceToPlanet = shipPosition.distanceTo(planetPosition);
        
        // Check if ship is too close to planet (add buffer for ship size)
        if (distanceToPlanet < planetRadius + 2) {
            collisionOccurred = true;
            
            // Calculate bounce direction (away from planet center)
            const bounceDirection = shipPosition.clone().sub(planetPosition).normalize();
            
            // Push ship away from planet and reduce velocity
            game.ship.position.x = bounceDirection.x * (planetRadius + 2);
            game.ship.position.z = bounceDirection.y * (planetRadius + 2);
            
            // Reduce velocity more significantly for planet collisions
            game.velocity.multiplyScalar(0.3);
            
            // Add visual feedback for planet collision
            if (game.planet.material.emissive) {
                game.planet.material.emissive.setHex(0xff0000);
                setTimeout(() => {
                    if (game.planet.material.emissive) {
                        game.planet.material.emissive.setHex(0);
                    }
                }, 200);
            }
        }
    }
    
    // Check obstacle collisions
    for (const obstacle of game.obstacles) {
        const distance = shipPosition.distanceTo(obstacle.position);
        
        if (distance < obstacle.radius + 1.5) {
            // Collision with obstacle - report collision
            collisionOccurred = true;
            
            // Visual feedback
            if (obstacle.mesh.material.emissive) {
                obstacle.mesh.material.emissive.setHex(0xff0000);
                setTimeout(() => {
                    if (obstacle.mesh.material.emissive) {
                        obstacle.mesh.material.emissive.setHex(0);
                    }
                }, 200);
            }
            
            break;
        }
    }
    
    // Check boost item collisions
    for (const boost of game.boosts) {
        if (!boost.mesh.userData.active) continue;
        
        const distance = shipPosition.distanceTo(boost.position);
        
        if (distance < boost.radius + 2) {
            // Collect boost item
            boost.mesh.userData.active = false;
            boost.mesh.visible = false;
            
            // Add boost to player
            game.boostAmount = Math.min(game.maxBoost, game.boostAmount + 30);
            updateBoostMeter();
        }
    }
    
    return collisionOccurred;
}

// Check if ship is within track boundaries
function checkTrackBoundaries() {
    if (!game.ship || !game.track) return false;
    
    const shipPosition = new THREE.Vector2(
        game.ship.position.x,
        game.ship.position.z
    );
    
    // Calculate distance from track center
    const trackCenter = new THREE.Vector2(0, 0);
    const distanceFromCenter = shipPosition.distanceTo(trackCenter);
    
    // Check if ship is outside track boundaries
    const innerBoundary = game.track.radius - game.trackWidth / 2;
    const outerBoundary = game.track.radius + game.trackWidth / 2;
    
    const offTrack = distanceFromCenter < innerBoundary || distanceFromCenter > outerBoundary;
    
    // Slide ship back toward track if off track
    if (offTrack) {
        // Calculate direction vector from center to ship
        const centerToShip = new THREE.Vector2(
            game.ship.position.x, 
            game.ship.position.z
        ).normalize();
        
        // Target radius - where the ship should be
        const targetRadius = THREE.MathUtils.clamp(
            distanceFromCenter,
            innerBoundary,
            outerBoundary
        );
        
        // Push back towards track with scaled force
        const pushBackForce = 0.02;
        
        if (distanceFromCenter < innerBoundary) {
            // Push outward
            game.ship.position.x += centerToShip.x * pushBackForce;
            game.ship.position.z += centerToShip.y * pushBackForce;
        } else if (distanceFromCenter > outerBoundary) {
            // Push inward
            game.ship.position.x -= centerToShip.x * pushBackForce;
            game.ship.position.z -= centerToShip.y * pushBackForce;
        }
    }
    
    return offTrack;
}

// Check if player has completed a lap with precision
function checkLapCompletion() {
    if (!game.ship || !game.track) return;
    
    const shipPosition = new THREE.Vector2(
        game.ship.position.x,
        game.ship.position.z
    );
    
    // Calculate closest point on track to the ship
    let closestPoint = 0;
    let minDistance = Infinity;
    
    // Sample points along the track to find the closest one
    const sampleCount = 100;
    for (let i = 0; i < sampleCount; i++) {
        const t = i / sampleCount;
        const point = game.track.curve.getPoint(t);
        const distance = shipPosition.distanceTo(new THREE.Vector2(point.x, point.y));
        
        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = t;
        }
    }
    
    // Store current track progress (0 to 1)
    game.trackProgress = closestPoint;
    
    // Define checkpoints (start/finish line is at 0)
    // We'll use 8 checkpoints around the track (0, 0.125, 0.25, ... 0.875)
    const checkpointCount = 8;
    const checkpointSize = 1 / checkpointCount;
    
    // Determine current checkpoint
    const currentCheckpoint = Math.floor(closestPoint / checkpointSize);
    
    // Initialize checkpointsPassed for current lap if it doesn't exist
    if (!game.checkpointsPassed[game.lap]) {
        game.checkpointsPassed[game.lap] = new Array(checkpointCount).fill(false);
    }
    
    // Mark the current checkpoint as passed
    game.checkpointsPassed[game.lap][currentCheckpoint] = true;
    
    // Check if we've crossed the start/finish line
    if (currentCheckpoint === 0 && game.lastCheckpoint === checkpointCount - 1) {
        // Verify the ship is moving forward
        const forwardDir = new THREE.Vector3(0, 0, 1);
        forwardDir.applyQuaternion(game.ship.quaternion);
        const movement = game.velocity.dot(forwardDir);
        
        // Check if player has actually completed a full circuit
        const hasCompletedFullCircuit = !game.requiredProgressForLap || 
                                       checkAllCheckpointsPassed(game.lap);
        
        if (movement > 0 && hasCompletedFullCircuit) {
            // Completed a valid lap
            game.lap++;
            
            // Reset checkpoint tracking for the new lap
            game.checkpointsPassed[game.lap] = new Array(checkpointCount).fill(false);
            
            // Mark the starting checkpoint as passed for the new lap
            game.checkpointsPassed[game.lap][0] = true;
            
            // Play lap completion effect
            console.log("Lap completed: " + game.lap + "/" + game.totalLaps);
            
            // Check if race is finished
            if (game.lap >= game.totalLaps) {
                finishRace();
                return;
            }
        } else if (movement > 0 && !hasCompletedFullCircuit) {
            console.log("Attempted lap completion rejected - full circuit not completed");
        }
    }
    
    // Update last checkpoint if we've reached a new one
    if (currentCheckpoint !== game.lastCheckpoint) {
        game.lastCheckpoint = currentCheckpoint;
    }
}

// Helper function to check if all checkpoints in a lap have been passed
function checkAllCheckpointsPassed(lapNumber) {
    if (!game.checkpointsPassed[lapNumber]) {
        return false;
    }
    
    return game.checkpointsPassed[lapNumber].every(passed => passed);
}

// Update HUD elements
function updateHUD() {
    if (!game.racing) return;
    
    // Update speed display
    speedValueEl.textContent = Math.round(game.speed * 100);
    
    // Update timer - calculate from startTime
    const currentTime = Date.now();
    game.elapsedTime = currentTime - game.startTime;
    timerValueEl.textContent = formatTime(game.elapsedTime);
    
    // Update lap counter
    lapCounterEl.textContent = `LAP ${game.lap + 1}/${game.totalLaps}`;
    
    // Update position counter
    updatePositionCounter();
    
    // Debug: Show checkpoint progress (uncomment for debugging)
    // updateCheckpointDebug();
}

// Debug function to visualize checkpoint tracking
function updateCheckpointDebug() {
    if (!game.checkpointsPassed[game.lap]) return;
    
    // Create or get debug element
    let debugEl = document.getElementById('checkpoint-debug');
    
    if (!debugEl) {
        debugEl = document.createElement('div');
        debugEl.id = 'checkpoint-debug';
        debugEl.style.position = 'fixed';
        debugEl.style.bottom = '10px';
        debugEl.style.left = '10px';
        debugEl.style.backgroundColor = 'rgba(0,0,0,0.7)';
        debugEl.style.color = '#4fd1c5';
        debugEl.style.padding = '5px';
        debugEl.style.borderRadius = '3px';
        debugEl.style.fontFamily = 'monospace';
        debugEl.style.fontSize = '12px';
        document.body.appendChild(debugEl);
    }
    
    // Create checkpoint visualization
    let checkpointStr = `Lap ${game.lap+1} Progress: ${Math.round(game.trackProgress * 100)}%\n`;
    checkpointStr += 'Checkpoints: ';
    
    for (let i = 0; i < game.checkpointsPassed[game.lap].length; i++) {
        if (game.checkpointsPassed[game.lap][i]) {
            checkpointStr += '✓ ';
        } else {
            checkpointStr += '✗ ';
        }
    }
    
    debugEl.textContent = checkpointStr;
}

// Calculate and update the player's position in the race
function updatePositionCounter() {
    if (!game.ship) return;
    
    // Create an array of all racers (player + AI + multiplayer players)
    const racers = [];
    
    // Add player
    racers.push({
        name: game.playerName,
        lap: game.lap,
        progress: game.trackProgress,
        isPlayer: true
    });
    
    // Add AI racers
    for (const id in game.players) {
        const player = game.players[id];
        racers.push({
            name: player.name,
            lap: player.lap,
            progress: player.progress,
            isPlayer: false
        });
    }
    
    // Add multiplayer players
    if (game.multiplayer) {
        for (const id in game.multiplayerPlayers) {
            const player = game.multiplayerPlayers[id];
            racers.push({
                name: player.name,
                lap: player.lap,
                progress: player.progress,
                isPlayer: false,
                isMultiplayer: true
            });
        }
    }
    
    // Sort racers by position (lap first, then progress)
    racers.sort((a, b) => {
        // Compare laps first
        if (a.lap !== b.lap) {
            return b.lap - a.lap; // Higher lap = better position
        }
        // If same lap, compare progress
        return b.progress - a.progress; // Higher progress = better position
    });
    
    // Find player's position
    let playerPosition = 0;
    for (let i = 0; i < racers.length; i++) {
        if (racers[i].isPlayer) {
            playerPosition = i + 1; // +1 because positions are 1-indexed
            break;
        }
    }
    
    // Update position counter in HUD
    positionValueEl.textContent = `${playerPosition}/${racers.length}`;
    
    // Also store the current position in game state
    game.currentPosition = playerPosition;
}

// Update boost meter display
function updateBoostMeter() {
    const boostPercentage = (game.boostAmount / game.maxBoost) * 100;
    boostMeterFillEl.style.width = boostPercentage + '%';
}

// Format time as MM:SS.MS
function formatTime(ms) {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((ms % 1000) / 10);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

// Handle race completion
function finishRace() {
    game.racing = false;
    
    // Update connection status
    updateConnectionStatus();
    
    // Check if we're already showing the finish screen (prevent double triggers)
    if (!finishScreenEl.classList.contains('hidden')) return;
    
    // Calculate final stats
    const finalTime = game.elapsedTime;
    const finalPosition = game.currentPosition;
    
    // Show finish screen
    finishScreenEl.classList.remove('hidden');
    hudEl.classList.add('hidden');
    
    // Keep Vibe Jam badge hidden on finish screen
    const vibeJamBadge = document.getElementById('vibe-jam-badge');
    if (vibeJamBadge) {
        vibeJamBadge.style.display = 'none';
    }
    
    // Set finish screen values
    finalTimeEl.textContent = `TIME: ${formatTime(finalTime)}`;
    finalPositionEl.textContent = `POSITION: ${finalPosition}/8`;
    
    // Add lap information 
    createFinalLapsElement();
    
    // Save to leaderboard
    saveToLeaderboard();
}

// Create or update the final laps element
function createFinalLapsElement() {
    const finalLapsEl = document.getElementById('final-laps');
    if (finalLapsEl) {
        finalLapsEl.textContent = `LAPS: ${game.totalLaps}`;
        return finalLapsEl;
    }
    
    // If element doesn't exist, create it
    const newFinalLapsEl = document.createElement('div');
    newFinalLapsEl.id = 'final-laps';
    newFinalLapsEl.textContent = `LAPS: ${game.totalLaps}`;
    newFinalLapsEl.style.margin = '10px 0';
    newFinalLapsEl.style.fontSize = '1.2rem';
    
    // Insert after final position
    finalPositionEl.parentNode.insertBefore(newFinalLapsEl, finalPositionEl.nextSibling);
    return newFinalLapsEl;
}

// Save race result to leaderboard with lap count
function saveToLeaderboard() {
    // Create entry data
    const entryData = {
        name: game.playerName,
        time: game.elapsedTime,
        position: game.currentPosition
    };
    
    // Send data to the server
    fetch(`/api/leaderboard/${game.totalLaps}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(entryData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Leaderboard entry saved:', data);
        // Display leaderboard after saving
        displayLeaderboard(game.totalLaps);
    })
    .catch(error => {
        console.error('Error saving to leaderboard:', error);
        // Fallback to localStorage if server is unavailable
        saveFallbackToLocalStorage(game.totalLaps, entryData);
    });
}

// Fallback to localStorage if server is unavailable
function saveFallbackToLocalStorage(lapCount, entryData) {
    console.log('Using localStorage fallback for leaderboard');
    const lapCountKey = `nebulaRacersLeaderboard_${lapCount}`;
    let leaderboard = JSON.parse(localStorage.getItem(lapCountKey) || '[]');
    
    leaderboard.push({
        ...entryData,
        laps: lapCount
    });
    
    // Sort by time
    leaderboard.sort((a, b) => a.time - b.time);
    
    // Keep only top 50
    leaderboard = leaderboard.slice(0, 50);
    
    // Save to local storage
    localStorage.setItem(lapCountKey, JSON.stringify(leaderboard));
    
    // Display leaderboard
    displayLeaderboard(lapCount);
}

// Display leaderboard in finish screen for the current lap count only
function displayLeaderboard(lapCount = 3) {
    // Fetch leaderboard data from server
    fetch(`/api/leaderboard/${lapCount}`)
    .then(response => response.json())
    .then(leaderboard => {
        updateLeaderboardDisplay(leaderboard, lapCount);
    })
    .catch(error => {
        console.error('Error fetching leaderboard:', error);
        // Fallback to localStorage if server is unavailable
        const lapCountKey = `nebulaRacersLeaderboard_${lapCount}`;
        const localLeaderboard = JSON.parse(localStorage.getItem(lapCountKey) || '[]');
        updateLeaderboardDisplay(localLeaderboard, lapCount);
    });
}

// Update the leaderboard display with provided data
function updateLeaderboardDisplay(leaderboard, lapCount) {
    // Clear existing entries
    leaderboardListEl.innerHTML = '';
    
    // Add entries if there are any
    if (leaderboard && leaderboard.length > 0) {
        leaderboard.forEach((entry, index) => {
            const li = document.createElement('li');
            const positionText = entry.position ? ` (${entry.position}/8)` : '';
            li.textContent = `${index + 1}. ${entry.name}: ${formatTime(entry.time)}${positionText}`;
            
            // Highlight the player's new entry
            if (entry.name === game.playerName && 
                Math.abs(entry.time - game.elapsedTime) < 100 && // Within 100ms to account for timing differences
                entry.laps === game.totalLaps) {
                li.style.color = '#4fd1c5';
                li.style.fontWeight = 'bold';
            }
            
            leaderboardListEl.appendChild(li);
        });
    } else {
        // Show a message if no leaderboard entries exist
        const li = document.createElement('li');
        li.textContent = `No records for ${lapCount} laps yet. Race to set a record!`;
        li.style.opacity = "0.7";
        li.style.fontStyle = "italic";
        leaderboardListEl.appendChild(li);
    }
}

// Load leaderboard from server based on lap count
function loadLeaderboard(lapCount = 3) {
    // Fetch leaderboard data from server
    fetch(`/api/leaderboard/${lapCount}`)
    .then(response => response.json())
    .then(leaderboard => {
        // Clear existing entries
        leaderboardListEl.innerHTML = '';
        
        // Add entries if there are any
        if (leaderboard && leaderboard.length > 0) {
            leaderboard.forEach((entry, index) => {
                const li = document.createElement('li');
                const positionText = entry.position ? ` (${entry.position}/8)` : '';
                li.textContent = `${index + 1}. ${entry.name}: ${formatTime(entry.time)}${positionText}`;
                leaderboardListEl.appendChild(li);
            });
        } else {
            // Show a message if no leaderboard entries exist
            const li = document.createElement('li');
            li.textContent = `No records for ${lapCount} laps yet. Race to set a record!`;
            li.style.opacity = "0.7";
            li.style.fontStyle = "italic";
            leaderboardListEl.appendChild(li);
        }
    })
    .catch(error => {
        console.error('Error loading leaderboard:', error);
        // Fallback to localStorage if server is unavailable
        const lapCountKey = `nebulaRacersLeaderboard_${lapCount}`;
        const localLeaderboard = JSON.parse(localStorage.getItem(lapCountKey) || '[]');
        
        // Clear existing entries
        leaderboardListEl.innerHTML = '';
        
        // Add entries if there are any
        if (localLeaderboard && localLeaderboard.length > 0) {
            localLeaderboard.forEach((entry, index) => {
                const li = document.createElement('li');
                const positionText = entry.position ? ` (${entry.position}/8)` : '';
                li.textContent = `${index + 1}. ${entry.name}: ${formatTime(entry.time)}${positionText}`;
                leaderboardListEl.appendChild(li);
            });
        } else {
            // Show a message if no leaderboard entries exist
            const li = document.createElement('li');
            li.textContent = `No records for ${lapCount} laps yet. Race to set a record!`;
            li.style.opacity = "0.7";
            li.style.fontStyle = "italic";
            leaderboardListEl.appendChild(li);
        }
    });
}

// Handle window resize
function onWindowResize() {
    game.camera.aspect = window.innerWidth / window.innerHeight;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop with camera update during countdown
function animate() {
    requestAnimationFrame(animate);
    
    // Update camera even if not racing (for countdown)
    if (!game.racing && game.ship) {
        updateCamera();
    }
    
    // Update ship movement
    updateShipMovement();
    
    // Update AI players
    updateAIPlayers();
    
    // Animate boost items
    animateBoostItems();
    
    // Update boost particles
    updateBoostParticles();
    
    // Send player position updates in multiplayer mode
    if (game.multiplayer && game.isConnected && game.ship) {
        game.socket.emit('playerUpdate', {
            position: {
                x: game.ship.position.x,
                y: game.ship.position.y,
                z: game.ship.position.z
            },
            rotation: {
                x: game.ship.rotation.x,
                y: game.ship.rotation.y,
                z: game.ship.rotation.z
            },
            lap: game.lap,
            progress: game.trackProgress,
            racing: game.racing
        });
    }
    
    // Animate only the portal particles, keep the portal structure static
    if (game.portal && game.portal.particles) {
        const positions = game.portal.particles.geometry.attributes.position.array;
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < positions.length; i += 3) {
            const i3 = i / 3;
            const radius = 4 + Math.sin(i3 + time) * 0.5;
            const angle = (i3 / positions.length * 3) * Math.PI * 2 + time;
            
            positions[i] = Math.cos(angle) * radius;
            positions[i + 1] = Math.sin(i3 * 5 + time) * 1.5;
            positions[i + 2] = Math.sin(angle) * radius;
        }
        
        game.portal.particles.geometry.attributes.position.needsUpdate = true;
    }
    
    // Also animate return portal particles if they exist
    if (game.returnPortal && game.returnPortal.particles) {
        const positions = game.returnPortal.particles.geometry.attributes.position.array;
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < positions.length; i += 3) {
            const i3 = i / 3;
            const radius = 4 + Math.sin(i3 + time) * 0.5;
            const angle = (i3 / positions.length * 3) * Math.PI * 2 + time;
            
            positions[i] = Math.cos(angle) * radius;
            positions[i + 1] = Math.sin(i3 * 5 + time) * 1.5;
            positions[i + 2] = Math.sin(angle) * radius;
        }
        
        game.returnPortal.particles.geometry.attributes.position.needsUpdate = true;
    }
    
    // Render scene
    game.renderer.render(game.scene, game.camera);
    
    // Rotate the planet (changed from +0.001 to -0.001 for opposite direction)
    if (game.planet) {
        game.planet.rotation.y -= 0.001;
    }
}

// Animate boost items
function animateBoostItems() {
    for (const boost of game.boosts) {
        if (!boost.mesh.userData.active) continue;
        
        // Rotate boost items
        boost.mesh.rotation.y += boost.mesh.userData.rotationSpeed;
        boost.mesh.rotation.x += boost.mesh.userData.rotationSpeed * 0.5;
        
        // Bounce boost items
        boost.mesh.userData.time += boost.mesh.userData.bounceSpeed;
        const y = boost.mesh.userData.initialY + 
                  Math.sin(boost.mesh.userData.time) * boost.mesh.userData.bounceHeight;
        boost.mesh.position.y = y;
    }
    
    // Animate nebula if exists
    if (game.nebula) {
        game.nebula.rotation.y += 0.0001;
    }
}

// Create visual boost effect
function createBoostEffect() {
    // Create a boost trail group
    game.boostEffectGroup = new THREE.Group();
    game.ship.add(game.boostEffectGroup);
    
    // Create simple core using the selected ship color
    const shipColor = new THREE.Color(game.shipColor);
    const coreGeometry = new THREE.SphereGeometry(0.8, 8, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: shipColor,
        transparent: true,
        opacity: 0.8
    });
    
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.z = -2;
    game.boostEffectGroup.add(core);
    
    // Set visibility
    game.boostEffectGroup.visible = false;
    
    // Add boost particles
    addBoostParticles();
}

// Add simplified particle effect for boost
function addBoostParticles() {
    const particleCount = 30; // Reduced particle count
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    // Initialize particles in a cone shape
    for (let i = 0; i < particleCount; i++) {
        // Create a more organized trail formation
        const distance = -2 - (i / particleCount) * 6; // More even spacing
        const angle = i % 6 * (Math.PI * 2 / 6); // Even distribution in a circle
        const radius = Math.abs(distance) * 0.15; // Wider at the back, narrower at front
        
        particlePositions[i * 3] = Math.cos(angle) * radius;
        particlePositions[i * 3 + 1] = Math.sin(angle) * radius;
        particlePositions[i * 3 + 2] = distance;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    // Use the selected ship color for particles
    const shipColor = new THREE.Color(game.shipColor);
    
    // Simplified particle material
    const particleMaterial = new THREE.PointsMaterial({
        color: shipColor,
        size: 0.8,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    
    // Create particle system
    game.boostParticles = new THREE.Points(particleGeometry, particleMaterial);
    game.boostEffectGroup.add(game.boostParticles);
    
    // Store original positions for animation
    game.boostParticles.userData = {
        positions: particlePositions.slice(),
        time: 0
    };
}

// Update boost particles with simpler animation
function updateBoostParticles() {
    if (!game.boostParticles || !game.boostEffectGroup || !game.boostEffectGroup.visible) return;
    
    const positions = game.boostParticles.geometry.attributes.position.array;
    const originalPositions = game.boostParticles.userData.positions;
    
    // Simple animation time
    game.boostParticles.userData.time += 0.1;
    const time = game.boostParticles.userData.time;
    
    // Update core with subtle pulsing
    if (game.boostEffectGroup.children[0]) {
        const pulseFactor = 0.9 + Math.sin(time * 0.5) * 0.1;
        game.boostEffectGroup.children[0].scale.set(pulseFactor, pulseFactor, pulseFactor);
    }
    
    // Update particles with a flowing motion
    for (let i = 0; i < positions.length / 3; i++) {
        // Get original position
        const baseX = originalPositions[i * 3];
        const baseY = originalPositions[i * 3 + 1];
        const baseZ = originalPositions[i * 3 + 2];
        
        // Simple cyclic movement based on particle index
        const offset = time + i * 0.2;
        const cycleSpeed = 0.3;
        
        // Apply subtle wave motion
        positions[i * 3] = baseX + Math.sin(offset * cycleSpeed) * 0.1;
        positions[i * 3 + 1] = baseY + Math.cos(offset * cycleSpeed) * 0.1;
        positions[i * 3 + 2] = baseZ;
    }
    
    // Mark position attribute as needing update
    game.boostParticles.geometry.attributes.position.needsUpdate = true;
    
    // Also update AI boost effects
    for (const id in game.players) {
        const player = game.players[id];
        if (player.boosting && player.boostEffect && player.boostEffect.visible) {
            // Pulse the core
            if (player.boostEffect.children[0]) {
                const aiPulseFactor = 0.9 + Math.sin(time * 0.5 + parseInt(id)) * 0.1;
                player.boostEffect.children[0].scale.set(aiPulseFactor, aiPulseFactor, aiPulseFactor);
                
                // Ensure colors always match the ship color in case they get reset
                if (player.shipColor) {
                    player.boostEffect.children[0].material.color.setHex(player.shipColor);
                    if (player.boostEffect.children[1]) {
                        player.boostEffect.children[1].material.color.setHex(player.shipColor);
                    }
                }
            }
        }
    }
}

// Update connection status display
function updateConnectionStatus() {
    const statusEl = document.getElementById('connection-status');
    if (!statusEl) return;
    
    if (!game.multiplayer) {
        statusEl.textContent = 'Singleplayer Mode';
        statusEl.className = '';
        return;
    }
    
    switch (game.connectionState) {
        case 'connected':
            statusEl.textContent = 'Connected to Server';
            statusEl.className = 'status-connected';
            break;
        case 'connecting':
            statusEl.textContent = 'Connecting...';
            statusEl.className = 'status-connecting';
            break;
        case 'disconnected':
            // Show different message based on whether in race or menu
            if (game.racing) {
                statusEl.textContent = 'Disconnected from Server';
                statusEl.className = 'status-disconnected';
            } else {
                statusEl.textContent = 'Ready for Multiplayer';
                statusEl.className = 'status-ready';
            }
            break;
    }
}

// Setup multiplayer connection
function setupMultiplayer() {
    try {
        game.connectionState = 'connecting';
        updateConnectionStatus();
        
        // Connect to socket.io server
        game.socket = io();
        
        // Connection event
        game.socket.on('connect', () => {
            console.log('Connected to server');
            game.id = game.socket.id;
            game.isConnected = true;
            game.connectionState = 'connected';
            updateConnectionStatus();
            
            // Send player data to server
            game.socket.emit('playerJoin', {
                name: game.playerName,
                position: {
                    x: game.ship.position.x,
                    y: game.ship.position.y,
                    z: game.ship.position.z
                },
                rotation: {
                    x: game.ship.rotation.x,
                    y: game.ship.rotation.y,
                    z: game.ship.rotation.z
                },
                shipColor: game.shipColor
            });
        });
        
        // Handle existing players
        game.socket.on('existingPlayers', (players) => {
            Object.keys(players).forEach(id => {
                if (id !== game.socket.id) {
                    addMultiplayerPlayer(id, players[id]);
                }
            });
        });
        
        // Handle new player joining
        game.socket.on('playerJoined', (player) => {
            // If we're in countdown, add to pending joins instead
            if (game.inCountdown) {
                // Store the player to add them after countdown
                if (!game.pendingPlayerJoins.some(p => p.id === player.id)) {
                    game.pendingPlayerJoins.push(player);
                    console.log(`Player ${player.id} join queued until after countdown`);
                }
            } else {
                // Add player normally if not in countdown
                addMultiplayerPlayer(player.id, player);
                
                // Only trigger reset if racing has already started
                if (game.racing) {
                    // Show notification
                    showNotification('New player joined! Race reset.');
                    // Reset race to starting line
                    resetRaceToStart();
                }
            }
        });
        
        // Handle player movement updates
        game.socket.on('playerMoved', (data) => {
            updateMultiplayerPlayer(data);
        });
        
        // Handle player disconnection
        game.socket.on('playerLeft', (id) => {
            removeMultiplayerPlayer(id);
        });
        
        // Handle race reset (from any player)
        game.socket.on('raceReset', (data) => {
            console.log(`Received race reset from ${data.initiator}`);
            
            // Don't process our own resets
            if (data.initiator === game.socket.id) {
                console.log('Ignoring own reset broadcast');
                return;
            }
            
            // Show notification
            showNotification('Race reset by another player!');
            
            // Only handle resets if we're in the game (not menu)
            if (game.ship) {
                // Handle race reset
                console.log('Resetting race in response to server event');
                
                // Stop current countdown if active
                if (game.inCountdown) {
                    // Find and remove countdown overlay
                    const overlay = document.querySelector('.countdown-overlay');
                    if (overlay) overlay.remove();
                }
                
                // Reset racing state
                game.racing = false;
                game.inCountdown = false;
                
                // Call reset function but without emitting another reset
                // This prevents infinite reset loops
                resetLocalRaceToStart();
            }
        });
        
        // Handle disconnection
        game.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            game.isConnected = false;
            game.connectionState = 'disconnected';
            updateConnectionStatus();
            
            // Remove all multiplayer players
            Object.keys(game.multiplayerPlayers).forEach(id => {
                removeMultiplayerPlayer(id);
            });
        });
    } catch (error) {
        console.error('Failed to connect to server:', error);
        game.connectionState = 'disconnected';
        updateConnectionStatus();
    }
}

// Reset race to starting line for all players
function resetRaceToStart() {
    // Stop racing
    game.racing = false;
    
    // If in the finish screen, go back to the game
    finishScreenEl.classList.add('hidden');
    hudEl.classList.remove('hidden');
    
    // Reset timing
    game.lap = 0;
    game.elapsedTime = 0;
    game.startTime = Date.now(); // Ensure this is set to current time
    
    // Reset timer display immediately
    timerValueEl.textContent = formatTime(0);
    
    // Update HUD
    updateHUD();
    
    // Clear and recreate boost effect
    if (game.ship && game.boostEffectGroup) {
        game.ship.remove(game.boostEffectGroup);
        game.boostEffectGroup = null;
        game.boostParticles = null;
    }
    
    // Position ship at starting line - this will recreate boost effect
    positionShipAtStart();
    
    // Reset AI players to starting line
    resetAIPlayers();
    
    // Clear boosts
    game.boostAmount = 100;
    updateBoostMeter();
    
    // Add any pending players before starting new countdown
    if (game.multiplayer && game.pendingPlayerJoins.length > 0) {
        game.pendingPlayerJoins.forEach(player => {
            addMultiplayerPlayer(player.id, player);
        });
        game.pendingPlayerJoins = []; // Clear the pending joins
    }
    
    // Emit a reset event to synchronize all players if in multiplayer
    if (game.multiplayer && game.isConnected && game.socket) {
        console.log('Broadcasting race reset to all players');
        game.socket.emit('broadcastReset', {
            initiator: game.id,
            timestamp: Date.now()
        });
    }
    
    // Start countdown
    startCountdown();
}

// Show notification message
function showNotification(message) {
    // Create notification element if it doesn't exist
    let notificationEl = document.getElementById('notification');
    
    if (!notificationEl) {
        notificationEl = document.createElement('div');
        notificationEl.id = 'notification';
        document.body.appendChild(notificationEl);
    }
    
    // Set message
    notificationEl.textContent = message;
    notificationEl.classList.add('show');
    
    // Remove after 3 seconds
    setTimeout(() => {
        notificationEl.classList.remove('show');
    }, 3000);
}

// Add a multiplayer player to the scene
function addMultiplayerPlayer(id, playerData) {
    if (game.multiplayerPlayers[id]) return;
    
    // Create player ship as a group for better control
    const playerShip = new THREE.Group();
    
    // Use cone geometry to match player and AI ships
    const shipGeometry = new THREE.ConeGeometry(1, 4, 4);
    const material = new THREE.MeshPhongMaterial({
        color: playerData.shipColor || '#4fd1c5',
        flatShading: true
    });
    
    const shipBody = new THREE.Mesh(shipGeometry, material);
    // Rotate ship to face forward instead of upward
    shipBody.rotation.x = Math.PI / 2;
    playerShip.add(shipBody);
    
    // Create name sprite and position it above the ship
    const nameSprite = createPlayerNameSprite(playerData.name, playerData.shipColor);
    nameSprite.position.set(0, 3, 0); // Position higher above the ship (changed from 2 to 3)
    playerShip.add(nameSprite);
    
    // Set initial position
    if (playerData.position) {
        playerShip.position.set(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
        );
    }
    
    // Set initial rotation
    if (playerData.rotation) {
        playerShip.rotation.set(
            playerData.rotation.x,
            playerData.rotation.y,
            playerData.rotation.z
        );
    }
    
    // Add to scene
    game.scene.add(playerShip);
    
    // Store player data
    game.multiplayerPlayers[id] = {
        mesh: playerShip,
        nameSprite: nameSprite,
        name: playerData.name || 'Player',
        position: playerShip.position.clone(),
        rotation: playerShip.rotation.clone(),
        lap: playerData.lap || 0,
        progress: playerData.progress || 0,
        racing: playerData.racing || false
    };
    
    console.log(`Added multiplayer player: ${id} (${playerData.name || 'Player'}) - InCountdown: ${game.inCountdown}`);
}

// Update a multiplayer player's position
function updateMultiplayerPlayer(data) {
    const player = game.multiplayerPlayers[data.id];
    if (!player) return;
    
    // Update position with smooth transition
    if (data.position) {
        player.mesh.position.lerp(
            new THREE.Vector3(
                data.position.x,
                data.position.y,
                data.position.z
            ),
            0.3
        );
    }
    
    // Update rotation with smooth transition
    if (data.rotation) {
        player.mesh.rotation.y = data.rotation.y;
        
        // Apply tilt for banking effect if there's z rotation
        if (data.rotation.z) {
            player.mesh.rotation.z = data.rotation.z;
        }
    }
    
    // Update other data
    player.lap = data.lap || player.lap;
    player.progress = data.progress || player.progress;
    player.racing = data.racing !== undefined ? data.racing : player.racing;
}

// Remove a multiplayer player from the scene
function removeMultiplayerPlayer(id) {
    const player = game.multiplayerPlayers[id];
    if (!player) return;
    
    // Remove mesh from scene (the group contains both the ship and the name sprite)
    if (player.mesh) {
        // The sprite is a child of the mesh (group), so it gets removed automatically
        game.scene.remove(player.mesh);
    }
    
    // Remove from players object
    delete game.multiplayerPlayers[id];
    
    console.log(`Removed multiplayer player: ${id}`);
}

// Update function
function update() {
    // ... existing code ...
    
    // Send player position updates in multiplayer mode
    if (game.multiplayer && game.isConnected && game.ship) {
        game.socket.emit('playerUpdate', {
            position: {
                x: game.ship.position.x,
                y: game.ship.position.y,
                z: game.ship.position.z
            },
            rotation: {
                x: game.ship.rotation.x,
                y: game.ship.rotation.y,
                z: game.ship.rotation.z
            },
            lap: game.lap,
            progress: game.trackProgress,
            racing: game.racing
        });
    }
    
    // ... existing code ...
}

// Create a text sprite for player names
function createPlayerNameSprite(name, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw background - more translucent black
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text - always white for better visibility
    context.font = 'bold 30px Arial'; // Increase the font size from 24px to 30px
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#FFFFFF';
    context.fillText(name || 'Player', canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 0.75, 1); // Increase sprite scale from (2, 0.5, 1) to (3, 0.75, 1)
    
    return sprite;
}

// Reset race locally without emitting a broadcast (to prevent loops)
function resetLocalRaceToStart() {
    // Stop racing
    game.racing = false;
    
    // If in the finish screen, go back to the game
    finishScreenEl.classList.add('hidden');
    hudEl.classList.remove('hidden');
    
    // Reset timing
    game.lap = 0;
    game.elapsedTime = 0;
    game.startTime = Date.now(); // Ensure this is set to current time
    
    // Reset timer display immediately
    timerValueEl.textContent = formatTime(0);
    
    // Update HUD
    updateHUD();
    
    // Position ship at starting line
    positionShipAtStart();
    
    // Reset AI players to starting line
    resetAIPlayers();
    
    // Clear boosts
    game.boostAmount = 100;
    updateBoostMeter();
    
    // Add any pending players before starting new countdown
    if (game.multiplayer && game.pendingPlayerJoins.length > 0) {
        game.pendingPlayerJoins.forEach(player => {
            addMultiplayerPlayer(player.id, player);
        });
        game.pendingPlayerJoins = []; // Clear the pending joins
    }
    
    // Start countdown without emitting more events
    startCountdown();
}

// Initialize the game
init(); 

// Reset AI players to the starting line
function resetAIPlayers() {
    // Calculate lane width within the track
    const laneWidth = game.trackWidth / 8; // 8 total racers (7 AI + player)
    
    // Get the number of AI players
    const aiPlayers = Object.keys(game.players).filter(id => id.startsWith('ai-'));
    
    // Create an array of all lanes (1-8)
    let availableLanes = [1, 2, 3, 4, 5, 6, 7, 8];
    
    // Remove player's lane from available lanes
    if (game.playerLane) {
        availableLanes = availableLanes.filter(lane => lane !== game.playerLane);
    }
    
    // Shuffle available lanes to randomize AI positions
    availableLanes = shuffleArray(availableLanes);
    
    // Reset each AI player
    aiPlayers.forEach((id, index) => {
        const player = game.players[id];
        if (!player || !player.mesh) return;
        
        // Reset AI progress and lap count
        player.progress = 0;
        player.lastProgress = 0;
        player.lap = 0;
        
        // Assign a lane (ensuring no collisions at start)
        const laneIndex = availableLanes[index % availableLanes.length];
        player.lane = laneIndex;
        
        // Calculate proper radial offset for the lane
        const innerRadius = game.track.radius - game.trackWidth / 2;
        const radialOffset = innerRadius + (laneIndex - 0.5) * laneWidth;
        
        // Get the starting point and tangent
        const startPoint = game.track.curve.getPoint(0);
        const tangent = game.track.curve.getTangent(0);
        
        // Calculate direction vector from center to start point
        const centerToEdge = new THREE.Vector2(startPoint.x, startPoint.y).normalize();
        
        // Set position with proper radial offset
        player.mesh.position.set(
            centerToEdge.x * radialOffset,
            1, 
            centerToEdge.y * radialOffset
        );
        
        // Set the orientation using the tangent
        const direction = new THREE.Vector3(tangent.x, 0, tangent.y);
        direction.normalize();
        
        const target = new THREE.Vector3(
            player.mesh.position.x + direction.x,
            player.mesh.position.y,
            player.mesh.position.z + direction.z
        );
        player.mesh.lookAt(target);
        
        // Reset AI boost and boost effect
        player.boostAmount = 100;
        player.boosting = false;
        player.boostCooldown = 0;
        
        if (player.boostEffect) {
            player.boostEffect.visible = false;
        }
    });
}

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Disconnect from the multiplayer server
function disconnectFromServer() {
    if (game.socket && game.isConnected) {
        console.log('Manually disconnecting from server');
        
        // Close the socket connection
        game.socket.disconnect();
        
        // Reset connection state
        game.socket = null;
        game.id = null;
        game.isConnected = false;
        game.connectionState = 'disconnected';
        
        // Clear any multiplayer players
        Object.keys(game.multiplayerPlayers).forEach(id => {
            removeMultiplayerPlayer(id);
        });
        
        // Reset multiplayer players collection
        game.multiplayerPlayers = {};
        
        // Update the connection status display
        updateConnectionStatus();
        
        // Reset the multiplayer toggle UI if we're in the menu
        if (!game.racing) {
            const multiplayerToggle = document.getElementById('multiplayer-toggle');
            if (multiplayerToggle) {
                multiplayerToggle.checked = false;
                game.multiplayer = false;
            }
        }
    }
}

// Handle touch/mouse start
function handleTouchStart(event) {
    // Only process if racing
    if (!game.racing) return;
    
    // Only prevent default behavior if we're racing
    event.preventDefault();
    
    // Get current time for double-tap detection
    const currentTime = Date.now();
    
    // Check if this is a double-tap (second tap within the time window)
    if (currentTime - game.touchControls.lastTapTime < game.touchControls.doubleTapDelay) {
        // This is a double-tap, activate boost (like pressing Space)
        game.touchControls.isDoubleTapped = true;
        keys.Space = true;
    } else {
        // This is a single tap, just normal touch controls
        game.touchControls.isDoubleTapped = false;
    }
    
    // Update last tap time
    game.touchControls.lastTapTime = currentTime;
    
    // Set touch control state
    game.touchControls.isPressed = true;
    
    // Get X position (works for both mouse and touch)
    if (event.type === 'touchstart') {
        game.touchControls.startX = event.touches[0].clientX;
        game.touchControls.currentX = event.touches[0].clientX;
    } else {
        game.touchControls.startX = event.clientX;
        game.touchControls.currentX = event.clientX;
    }
    
    // Set forward acceleration (like pressing Up arrow)
    // Only set forward if not double-tapped - avoid conflicts
    if (!game.touchControls.isDoubleTapped) {
        keys.ArrowUp = true;
    }
}

// Handle touch/mouse move
function handleTouchMove(event) {
    // Only process if racing and touch is active
    if (!game.racing || !game.touchControls.isPressed) return;
    
    // Only prevent default behavior if we're racing and handling touch
    event.preventDefault();
    
    // Update current X position
    if (event.type === 'touchmove') {
        game.touchControls.currentX = event.touches[0].clientX;
    } else {
        game.touchControls.currentX = event.clientX;
    }
    
    // If this is a double-tap boost, we still want turning but not regular indicator updates
    if (game.touchControls.isDoubleTapped) {
        const screenWidth = window.innerWidth;
        const moveThreshold = screenWidth * 0.05; // 5% of screen width
        const xDiff = game.touchControls.currentX - game.touchControls.startX;
        
        // Reset turning keys first
        keys.ArrowLeft = false;
        keys.ArrowRight = false;
        
        // Apply turning during boost
        if (xDiff < -moveThreshold) {
            // Turn left during boost
            keys.ArrowLeft = true;
        } else if (xDiff > moveThreshold) {
            // Turn right during boost
            keys.ArrowRight = true;
        }
        
        return; // Skip regular movement handling
    }
    
    // Regular movement handling
    const screenWidth = window.innerWidth;
    const moveThreshold = screenWidth * 0.05; // 5% of screen width
    const xDiff = game.touchControls.currentX - game.touchControls.startX;
    
    // Reset turning keys first
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    
    // Apply turning based on horizontal movement
    if (xDiff < -moveThreshold) {
        // Turn left
        keys.ArrowLeft = true;
    } else if (xDiff > moveThreshold) {
        // Turn right
        keys.ArrowRight = true;
    }
}

// Handle touch/mouse end
function handleTouchEnd(event) {
    // Only process if racing
    if (!game.racing) return;
    
    // Only prevent default behavior if we're racing
    event.preventDefault();
    
    // Stop all touch-controlled movement
    game.touchControls.isPressed = false;
    
    // Reset ALL directional keys regardless of boost state
    keys.ArrowUp = false;
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    
    // If this was a double-tap and hold for boost, release boost
    if (game.touchControls.isDoubleTapped) {
        keys.Space = false;
        game.touchControls.isDoubleTapped = false;
    }
}

// Add the red planet to the scene
function createRedPlanet(trackRadius) {
    // Create a canvas for the planet texture
    const textureSize = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext('2d');

    // Base color matching the obstacles (0xff3333)
    const baseRed = 255;
    const baseGreen = 51;
    const baseBlue = 51;

    // Create gradient bands
    for (let y = 0; y < textureSize; y++) {
        // Create horizontal bands with varying colors
        const t = y / textureSize;
        
        // Increase band contrast
        const bandFreq = 15; // Number of major bands
        const noise = Math.sin(t * Math.PI * bandFreq) * 0.7 + 0.3; // Increased amplitude for more contrast
        
        // Create a gradient for each line
        const gradient = ctx.createLinearGradient(0, y, textureSize, y);
        
        // Much darker base for more contrast
        gradient.addColorStop(0, `rgb(${baseRed * 0.3 + noise * 100}, ${baseGreen * 0.2 + noise * 30}, ${baseBlue * 0.2 + noise * 30})`);
        
        // Higher contrast variations around the obstacle color
        gradient.addColorStop(0.2, `rgb(${baseRed * 0.5 + noise * 120}, ${baseGreen * 0.3 + noise * 40}, ${baseBlue * 0.3 + noise * 40})`);
        gradient.addColorStop(0.4, `rgb(${baseRed * 0.8 + noise * 80}, ${baseGreen * 0.4 + noise * 30}, ${baseBlue * 0.4 + noise * 30})`);
        gradient.addColorStop(0.6, `rgb(${baseRed * 0.4 + noise * 150}, ${baseGreen * 0.25 + noise * 35}, ${baseBlue * 0.25 + noise * 35})`);
        gradient.addColorStop(0.8, `rgb(${baseRed * 0.6 + noise * 100}, ${baseGreen * 0.35 + noise * 35}, ${baseBlue * 0.35 + noise * 35})`);
        gradient.addColorStop(1, `rgb(${baseRed * 0.3 + noise * 100}, ${baseGreen * 0.2 + noise * 30}, ${baseBlue * 0.2 + noise * 30})`);

        // Draw the line
        ctx.fillStyle = gradient;
        ctx.fillRect(0, y, textureSize, 1);
    }

    // Add stronger noise texture for more detail
    for (let i = 0; i < 50000; i++) {
        const x = Math.random() * textureSize;
        const y = Math.random() * textureSize;
        const r = Math.random() * 2 + 1;
        
        const brightness = Math.random() * 50 - 25; // Increased brightness variation
        ctx.fillStyle = `rgba(${baseRed + brightness}, ${baseGreen * 0.4 + brightness * 0.3}, ${baseBlue * 0.4 + brightness * 0.3}, 0.15)`; // Increased opacity
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Create the main planet sphere with increased size
    const planetRadius = trackRadius * 0.6;
    const planetGeometry = new THREE.SphereGeometry(planetRadius, 128, 128); // Increased segments for smoother appearance
    const planetMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.7, // Slightly reduced roughness for better band visibility
        metalness: 0.3, // Slightly increased metalness for better contrast
        bumpScale: 0.02
    });

    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    planet.position.y = -planetRadius * 0.3; // Slightly below track level
    
    // Add rotation axis tilt like Jupiter
    planet.rotation.x = THREE.MathUtils.degToRad(3.13); // Jupiter's axial tilt
    
    game.scene.add(planet);

    // Store reference for animation
    game.planet = planet;
}

// Create Vibeverse portal
function createVibeVersePortal(trackRadius) {
    // Position the portal outside the track - set to 2.0 times the track radius
    const portalDistance = trackRadius * 2.0;
    const portalAngle = Math.PI / 4; // 45 degrees position
    const portalX = Math.cos(portalAngle) * portalDistance;
    const portalZ = Math.sin(portalAngle) * portalDistance;
    const portalY = 1; // Lowered to player level (was 5)
    
    // Create portal group
    const portalGroup = new THREE.Group();
    portalGroup.position.set(portalX, portalY, portalZ);
    
    // Make portal face toward center of track
    portalGroup.lookAt(0, portalY, 0);
    
    // Create portal ring (torus)
    const ringGeometry = new THREE.TorusGeometry(5, 0.5, 16, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff44, // Green color
        emissive: 0x00ff44,
        emissiveIntensity: 0.5,
        metalness: 0.7,
        roughness: 0.3
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    // No need to rotate the ring, as the parent group handles orientation
    portalGroup.add(ring);
    
    // Create portal disk (center)
    const diskGeometry = new THREE.CircleGeometry(4.5, 32);
    const diskMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff99,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const disk = new THREE.Mesh(diskGeometry, diskMaterial);
    // No need to rotate the disk, as the parent group handles orientation
    portalGroup.add(disk);
    
    // Add portal particles
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const radius = 4 + (Math.random() - 0.5);
        const angle = (i / particleCount) * Math.PI * 2;
        
        particlePositions[i3] = Math.cos(angle) * radius;
        particlePositions[i3 + 1] = (Math.random() - 0.5) * 2;
        particlePositions[i3 + 2] = Math.sin(angle) * radius;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x00ff88,
        size: 0.2,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    portalGroup.add(particles);
    
    // Add portal label
    createPortalLabel(portalGroup, "Vibeverse Portal");
    
    // Store references
    game.portal = {
        mesh: portalGroup,
        ring: ring,
        disk: disk,
        particles: particles
    };
    
    // Add to scene
    game.scene.add(portalGroup);
    
    // If player came from another game via portal, create a return portal
    if (game.comingFromPortal && game.referrerUrl) {
        createReturnPortal(trackRadius, game.referrerUrl);
    }
}

// Create portal text label
function createPortalLabel(portalGroup, text) {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw text
    context.fillStyle = '#00ff88';
    context.font = 'bold 32px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 128, 32);
    
    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(10, 2.5, 1);
    sprite.position.set(0, 6, 0); // Adjusted position (was 8)
    
    portalGroup.add(sprite);
}

// Create return portal for players coming from another game
function createReturnPortal(trackRadius, referrerUrl) {
    // Position the return portal NEXT to the main portal (slightly offset) - not opposite
    const portalDistance = trackRadius * 2.0;
    const portalAngle = Math.PI / 4 + 0.3; // Next to main portal (which is at Math.PI/4)
    const portalX = Math.cos(portalAngle) * portalDistance;
    const portalZ = Math.sin(portalAngle) * portalDistance;
    const portalY = 1; // Lowered to player level (was 5)
    
    // Create portal group
    const portalGroup = new THREE.Group();
    portalGroup.position.set(portalX, portalY, portalZ);
    
    // Make portal face toward center of track
    portalGroup.lookAt(0, portalY, 0);
    
    // Create return portal similar to main portal but with different color
    const ringGeometry = new THREE.TorusGeometry(5, 0.5, 16, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0x0088ff, // Blue color for return portal
        emissive: 0x0088ff,
        emissiveIntensity: 0.5,
        metalness: 0.7,
        roughness: 0.3
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    // No need to rotate the ring, as the parent group handles orientation
    portalGroup.add(ring);
    
    const diskGeometry = new THREE.CircleGeometry(4.5, 32);
    const diskMaterial = new THREE.MeshBasicMaterial({
        color: 0x0099ff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const disk = new THREE.Mesh(diskGeometry, diskMaterial);
    // No need to rotate the disk, as the parent group handles orientation
    portalGroup.add(disk);
    
    // Add portal particles
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const radius = 4 + (Math.random() - 0.5);
        const angle = (i / particleCount) * Math.PI * 2;
        
        particlePositions[i3] = Math.cos(angle) * radius;
        particlePositions[i3 + 1] = (Math.random() - 0.5) * 2;
        particlePositions[i3 + 2] = Math.sin(angle) * radius;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x0088ff,
        size: 0.2,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    portalGroup.add(particles);
    
    // Add return portal label with the name of the original game if available
    const portalLabel = referrerUrl.includes("://") ? 
        new URL(referrerUrl).hostname.replace("www.", "") : 
        "Return Portal";
    
    createPortalLabel(portalGroup, `Return to ${portalLabel}`);
    
    // Store references
    game.returnPortal = {
        mesh: portalGroup,
        ring: ring,
        disk: disk,
        particles: particles,
        url: referrerUrl
    };
    
    // Add to scene
    game.scene.add(portalGroup);
    
    // Add collision detection for return portal
    game.checkReturnPortalCollision = true;
}

// Redirect player to Vibeverse portal
function redirectToVibeVersePortal() {
    // Construct URL parameters
    const username = game.playerName || 'Player';
    const color = game.shipColor.startsWith('#') ? game.shipColor : '#' + game.shipColor;
    const speed = game.speed.toFixed(1);
    const refUrl = window.location.href.split('?')[0]; // Remove existing query params
    
    // Encode URL parameters
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('color', color);
    params.append('speed', speed);
    params.append('ref', refUrl);
    
    // Construct full redirect URL
    const redirectUrl = `http://portal.pieter.com/?${params.toString()}`;
    
    // Add a portal transition effect
    const transitionOverlay = document.createElement('div');
    transitionOverlay.style.position = 'fixed';
    transitionOverlay.style.top = '0';
    transitionOverlay.style.left = '0';
    transitionOverlay.style.width = '100%';
    transitionOverlay.style.height = '100%';
    transitionOverlay.style.backgroundColor = '#00ff88';
    transitionOverlay.style.opacity = '0';
    transitionOverlay.style.zIndex = '10000';
    transitionOverlay.style.transition = 'opacity 0.5s ease-in-out';
    document.body.appendChild(transitionOverlay);
    
    // Trigger fade-in
    setTimeout(() => {
        transitionOverlay.style.opacity = '1';
        
        // Redirect after animation completes
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 600);
    }, 10);
}

// Check for collisions with obstacles, boost items, and portals
function checkCollisions() {
    if (!game.ship) return false;
    
    const shipPosition = new THREE.Vector2(
        game.ship.position.x,
        game.ship.position.z
    );
    
    let collisionOccurred = false;

    // Check portal collision
    if (game.portal && game.portal.mesh) {
        const portalPosition = new THREE.Vector2(
            game.portal.mesh.position.x,
            game.portal.mesh.position.z
        );
        const portalRadius = 5; // Portal hit radius
        
        const distanceToPortal = shipPosition.distanceTo(portalPosition);
        
        if (distanceToPortal < portalRadius) {
            // Handle portal entry - redirect to Vibeverse portal
            redirectToVibeVersePortal();
            return false; // Don't process other collisions
        }
    }
    
    // Check return portal collision if exists
    if (game.checkReturnPortalCollision && game.returnPortal && game.returnPortal.mesh) {
        const returnPortalPosition = new THREE.Vector2(
            game.returnPortal.mesh.position.x,
            game.returnPortal.mesh.position.z
        );
        const returnPortalRadius = 5; // Portal hit radius
        
        const distanceToReturnPortal = shipPosition.distanceTo(returnPortalPosition);
        
        if (distanceToReturnPortal < returnPortalRadius) {
            // Redirect back to original game
            const transitionOverlay = document.createElement('div');
            transitionOverlay.style.position = 'fixed';
            transitionOverlay.style.top = '0';
            transitionOverlay.style.left = '0';
            transitionOverlay.style.width = '100%';
            transitionOverlay.style.height = '100%';
            transitionOverlay.style.backgroundColor = '#0088ff';
            transitionOverlay.style.opacity = '0';
            transitionOverlay.style.zIndex = '10000';
            transitionOverlay.style.transition = 'opacity 0.5s ease-in-out';
            document.body.appendChild(transitionOverlay);
            
            // Trigger fade-in
            setTimeout(() => {
                transitionOverlay.style.opacity = '1';
                
                // Get all current portal parameters to preserve them
                const username = game.playerName || 'Player';
                const color = game.shipColor.startsWith('#') ? game.shipColor : '#' + game.shipColor;
                const speed = game.speed.toFixed(1);
                
                // Check if the URL already has parameters
                let redirectUrl = game.returnPortal.url;
                const hasParams = redirectUrl.includes('?');
                const connector = hasParams ? '&' : '?';
                
                // Append portal=true to indicate this is a portal entrance
                redirectUrl += `${connector}portal=true&username=${encodeURIComponent(username)}&color=${encodeURIComponent(color)}&speed=${encodeURIComponent(speed)}`;
                
                // Redirect after animation completes
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 600);
            }, 10);
            
            return false; // Don't process other collisions
        }
    }

    // Check planet collision first
    if (game.planet) {
        // Create 2D position for planet (ignoring Y since it's centered)
        const planetPosition = new THREE.Vector2(0, 0); // Planet is at center
        const planetRadius = game.planet.geometry.parameters.radius;
        
        // Calculate distance from ship to planet center
        const distanceToPlanet = shipPosition.distanceTo(planetPosition);
        
        // Check if ship is too close to planet (add buffer for ship size)
        if (distanceToPlanet < planetRadius + 2) {
            collisionOccurred = true;
            
            // Calculate bounce direction (away from planet center)
            const bounceDirection = shipPosition.clone().sub(planetPosition).normalize();
            
            // Push ship away from planet and reduce velocity
            game.ship.position.x = bounceDirection.x * (planetRadius + 2);
            game.ship.position.z = bounceDirection.y * (planetRadius + 2);
            
            // Reduce velocity more significantly for planet collisions
            game.velocity.multiplyScalar(0.3);
            
            // Add visual feedback for planet collision
            if (game.planet.material.emissive) {
                game.planet.material.emissive.setHex(0xff0000);
                setTimeout(() => {
                    if (game.planet.material.emissive) {
                        game.planet.material.emissive.setHex(0);
                    }
                }, 200);
            }
        }
    }
    
    // Check obstacle collisions
    for (const obstacle of game.obstacles) {
        const distance = shipPosition.distanceTo(obstacle.position);
        
        if (distance < obstacle.radius + 1.5) {
            // Collision with obstacle - report collision
            collisionOccurred = true;
            
            // Visual feedback
            if (obstacle.mesh.material.emissive) {
                obstacle.mesh.material.emissive.setHex(0xff0000);
                setTimeout(() => {
                    if (obstacle.mesh.material.emissive) {
                        obstacle.mesh.material.emissive.setHex(0);
                    }
                }, 200);
            }
            
            break;
        }
    }
    
    // Check boost item collisions
    for (const boost of game.boosts) {
        if (!boost.mesh.userData.active) continue;
        
        const distance = shipPosition.distanceTo(boost.position);
        
        if (distance < boost.radius + 2) {
            // Collect boost item
            boost.mesh.userData.active = false;
            boost.mesh.visible = false;
            
            // Add boost to player
            game.boostAmount = Math.min(game.maxBoost, game.boostAmount + 30);
            updateBoostMeter();
        }
    }
    
    return collisionOccurred;
}