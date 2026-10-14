
import * as THREE from
    "https://cdn.jsdelivr.net/npm/three@0.180/build/three.module.js";

// ========================================
// SCENE AND CAMERA
// ========================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x080910);
scene.fog = new THREE.Fog(0x080910, 45, 190);

const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    500
);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

document.getElementById("game-container")
    .appendChild(renderer.domElement);

// ========================================
// LIGHTING
// ========================================

scene.add(
    new THREE.HemisphereLight(0x8799cc, 0x17121d, 2)
);

const moonlight = new THREE.DirectionalLight(
    0xb0c9ff,
    2
);

moonlight.position.set(-20, 35, 15);
scene.add(moonlight);

// ========================================
// GROUND
// ========================================

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshStandardMaterial({
        color: 0x171820,
        roughness: 0.95
    })
);

ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.08;
scene.add(ground);

// ========================================
// ROAD
// ========================================

const road = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 260),
    new THREE.MeshStandardMaterial({
        color: 0x24242d,
        roughness: 0.85
    })
);

road.rotation.x = -Math.PI / 2;
road.position.y = 0;
scene.add(road);

// Road markings
for (let z = -150; z < 110; z += 10) {
    const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.16, 4),
        new THREE.MeshBasicMaterial({
            color: 0xe8c9a8
        })
    );

    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.015, z);

    scene.add(line);
}


/* ========================================
   CITY BUILDINGS
======================================== */

function addBuilding(x, z, width, height, depth, colour) {
    const building = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({
            color: colour,
            roughness: 0.7,
            metalness: 0.25
        })
    );

    building.position.set(x, height / 2, z);
    scene.add(building);

    // Neon sign facing the road
    const sign = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.65, 0.35, 0.08),
        new THREE.MeshBasicMaterial({
            color: 0xff398b
        })
    );

    sign.position.set(
        x,
        Math.min(height * 0.7, height - 1),
        z + depth / 2 + 0.05
    );

    scene.add(sign);
}

for (let z = -130; z < 100; z += 18) {
    addBuilding(
        -18, z,
        8, 15 + Math.random() * 25, 8,
        0x202333
    );

    addBuilding(
        18, z,
        8, 15 + Math.random() * 25, 8,
        0x292033
    );
}


/* ========================================
   PLAYER CAR
======================================== */

const car = new THREE.Group();
scene.add(car);

const paint = new THREE.MeshStandardMaterial({
    color: 0xb72e48,
    metalness: 0.75,
    roughness: 0.25
});

const glass = new THREE.MeshStandardMaterial({
    color: 0x101b2a,
    metalness: 0.4,
    roughness: 0.15
});

function addCarPart(size, position, material) {
    const part = new THREE.Mesh(
        new THREE.BoxGeometry(...size),
        material
    );

    part.position.set(...position);
    car.add(part);

    return part;
}

// Car body
addCarPart([1.9, 0.55, 4], [0, 0.8, 0], paint);

// Cabin
addCarPart([1.45, 0.65, 1.8], [0, 1.35, 0.15], glass);

// Wheels
const wheels = [];

for (const x of [-1, 1]) {
    for (const z of [-1.25, 1.25]) {
        const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.38, 0.38, 0.25, 16
            ),
            new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 0.9
            })
        );

        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.4, z);

        car.add(wheel);
        wheels.push(wheel);
    }
}

// Rear lights
for (const x of [-0.65, 0.65]) {
    const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.15, 0.06),
        new THREE.MeshBasicMaterial({
            color: 0xff112f
        })
    );

    light.position.set(x, 0.9, 2.02);
    car.add(light);
}

// Front lights
for (const x of [-0.65, 0.65]) {
    const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.15, 0.06),
        new THREE.MeshBasicMaterial({
            color: 0xbdeaff
        })
    );

    light.position.set(x, 0.9, -2.02);
    car.add(light);
}

car.position.set(0, 0, 25);


/* ========================================
   CONTROLS
======================================== */

const keys = {};

window.addEventListener("keydown", event => {
    keys[event.key.toLowerCase()] = true;

    if (["arrowup", "arrowdown", "arrowleft",
         "arrowright", " "].includes(event.key.toLowerCase())) {
        event.preventDefault();
    }
});

window.addEventListener("keyup", event => {
    keys[event.key.toLowerCase()] = false;
});

let speed = 0;
let heading = 0;

const acceleration = 20;
const maxSpeed = 32;
const reverseSpeed = 10;

/* ========================================
   CAR PHYSICS
======================================== */

function updateCar(dt) {
    const forward = keys["w"] || keys["arrowup"];
    const backward = keys["s"] || keys["arrowdown"];
    const left = keys["a"] || keys["arrowleft"];
    const right = keys["d"] || keys["arrowright"];
    const handbrake = keys[" "];

    if (forward) speed += acceleration * dt;
    if (backward) speed -= acceleration * dt;

    speed = THREE.MathUtils.clamp(
        speed, -reverseSpeed, maxSpeed
    );

    const drag = handbrake ? 2.8 : 0.65;

    if (!forward && !backward) {
        speed -= Math.sign(speed) * drag * dt;

        if (Math.abs(speed) < 0.15) speed = 0;
    }

    const steering = (right ? 1 : 0) - (left ? 1 : 0);
    const speedFactor = Math.min(Math.abs(speed) / 8, 1);

    heading -= steering * speedFactor *
        (handbrake ? 2.2 : 1.5) * dt *
        (speed >= 0 ? 1 : -1);

    car.rotation.y = heading;

    car.position.x -= Math.sin(heading) * speed * dt;
    car.position.z -= Math.cos(heading) * speed * dt;

    for (const wheel of wheels) {
        wheel.rotation.x += speed * dt / 0.38;
    }

    document.getElementById("speed").textContent =
        `${Math.round(Math.abs(speed) * 4)} KM/H`;
}

/* ========================================
   CAMERA
======================================== */

const cameraOffset = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();

function updateCamera(dt) {
    cameraOffset.set(
        Math.sin(heading) * 8,
        4.5,
        Math.cos(heading) * 8
    );

    const desiredPosition = car.position.clone()
        .add(cameraOffset);

    camera.position.lerp(
        desiredPosition,
        1 - Math.exp(-5 * dt)
    );

    cameraTarget.set(
        car.position.x,
        car.position.y + 1,
        car.position.z
    );

    camera.lookAt(cameraTarget);
}

/* ========================================
   GAME LOOP
======================================== */

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);

    updateCar(dt);
    updateCamera(dt);

    renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

updateCamera(1);
animate();