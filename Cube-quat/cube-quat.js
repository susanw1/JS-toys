/*
 *
 * Quaternion functions
 *
 */

function quatIdentity() { return [1, 0, 0, 0]; }             // [w, x, y, z]

function quatNormalize(q) {
    const len = Math.hypot(...q);
    return q.map(v => v / len);
}

function quatMultiply(a, b) {
    const [aw, ax, ay, az] = a;
    const [bw, bx, by, bz] = b;
    return [
        aw*bw - ax*bx - ay*by - az*bz,
        aw*bx + ax*bw + ay*bz - az*by,
        aw*by - ax*bz + ay*bw + az*bx,
        aw*bz + ax*by - ay*bx + az*bw
    ];
}

// axis as [x,y,z] vector
function quatFromAxisAngle(axis, angle) {
    let [x, y, z] = axis;
    const len = Math.hypot(x, y, z);
    if (len === 0) return [1, 0, 0, 0];
    x /= len; y /= len; z /= len;

    const half = angle / 2;
    const s = Math.sin(half);
    return [Math.cos(half), x * s, y * s, z * s];  // unit quat if axis is unit
}

// Rotate vector v by quaternion q
function quatRotateVector(q, v) {
    const [w, x, y, z] = q;
    const [vx, vy, vz] = v;
    const uvx  = 2 * (y * vz - z * vy);
    const uvy  = 2 * (z * vx - x * vz);
    const uvz  = 2 * (x * vy - y * vx);
    const uuvx = y * uvz - z * uvy;
    const uuvy = z * uvx - x * uvz;
    const uuvz = x * uvy - y * uvx;
    return [
        vx + w * uvx + uuvx,
        vy + w * uvy + uuvy,
        vz + w * uvz + uuvz
    ];
}

function quatConjugate(q) {
    return [q[0], -q[1], -q[2], -q[3]];
}

function quatToMatrix(q) {
  // SAFETY: guard against slight drift — normalize first or scale by s
    let [w, x, y, z] = q;
    const s2 = w*w + x*x + y*y + z*z;
    if (Math.abs(1 - s2) > 1e-6) {
        const inv = 1 / Math.sqrt(s2);
        w *= inv; x *= inv; y *= inv; z *= inv;
    }

    return [
        [1 - 2*(y*y + z*z), 2*(x*y - z*w),   2*(x*z + y*w)],
        [2*(x*y + z*w),     1 - 2*(x*x + z*z), 2*(y*z - x*w)],
        [2*(x*z - y*w),     2*(y*z + x*w),   1 - 2*(x*x + y*y)]
    ];
}


/*
 *
 * Vector functions
 *
 */

/** clamp x to -1 <= x <= 1 */
function clamp01(x) {
    return Math.max(-1, Math.min(1, x));
}
function vlen(v) {
    return Math.hypot(v[0], v[1], v[2]);
}
function vnorm(v) {
    const L = vlen(v);
    return L > 0 ? [v[0] / L, v[1] / L, v[2] / L] : [0,0,0];
}
function vdot(a,b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function vcross(a,b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}


const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gameState = {
    x: 0, y: 0, z: 5,
    rotation: quatIdentity()  // orientation quaternion
};

const viewState = {
    x: 0, y: 0, z: 0,
    rotation: quatIdentity(),
    zoom: 600
};



let fpsMode = true; // true = FPS/world-up yaw, false = free-fly

// Pointer logic
let controlsEnabled = false;     // "game mode" (true when mouse is locked or pointer captured)
let activePointerId = null;      // for touch/stylus
let lastX = 0, lastY = 0;

// Key logic
const held = new Set();
let shiftHeld = false;

// Tracking
let trackEnabled = false;       // toggle with Enter
let leadTime = 0.20;            // seconds: predict where camera will be
let camVel = [0,0,0];           // world m/s estimate
const maxTurnRate = 3.5;        // rad/s yaw/pitch (overall shortest-arc)
const rollStabilize = 1.5;      // rad/s roll back toward world-up (0 to disable)


// Keys that cause scrolling / navigation in the browser by default
const NAV_KEYS = new Set([
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "PageUp", "PageDown", "Home", "End", "Space"
]);


const CUBE_DEF = {
    vertices: [ [-1, -0.75, -1.5], [-1, -0.75, 1.5], [-1, 0.75, 1.5], [-1, 0.75, -1.5], 
        [1, -0.75, -1.5], [1, -0.75, 1.5], [1, 0.75, 1.5], [1, 0.75, -1.5], ],
    edges:  [[0,1,2,3,0,4,5,6,7,4], [1,5], [6,2], [3,7]]
};


startGame();

// Note: passive:false to ensure key handler can preventDefault() to avoid unwanted page scrolls in all browsers
function startGame() {
    canvas.addEventListener('click', () => {
        canvas.requestPointerLock?.();
    });
    
    document.addEventListener('pointerlockchange', () => {
        controlsEnabled = (document.pointerLockElement === canvas) || (activePointerId !== null);
    });

    // POINTER DOWN: record start of pointer action
    canvas.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;        // mouse handled by pointer lock
        onPointerDown(e);
        e.preventDefault(); // stop scroll on mobile
    }, { passive: false });

    // POINTER MOVE: handle relative motion from either path
    canvas.addEventListener('pointermove', (e) => {
        if (!controlsEnabled) return;
        onPointerMove(e);
    }, { passive: false });

    // POINTER UP/CANCEL: release capture for touch/stylus
    canvas.addEventListener('pointerup', (e) => {
        onPointerUp(e);
    }, { passive: false });

    canvas.addEventListener('pointercancel', (e) => {
        onPointerUp(e);
    });

    document.addEventListener("keydown", (e) => {
        if (!controlsEnabled) return;
        if (NAV_KEYS.has(e.code)) e.preventDefault();
        keyDownHandler(e);
    }, { passive: false });

    document.addEventListener("keyup", (e) => {
        held.delete(e.code);
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            shiftHeld = held.has('ShiftLeft') || held.has('ShiftRight');
        }
    }, { passive: false });

    requestAnimationFrame(tick);
}


function keyDownHandler(e) {
    held.add(e.code);
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        shiftHeld = true;
    }
    if (e.code === 'KeyF') {
        fpsMode = !fpsMode; /* toggle FPS/free-fly mode */
    }    
    if (e.code === 'Enter') {
        trackEnabled = !trackEnabled; /* toggle view-tracking */
    }
}


const LOCAL_MOVE_VECTORS = {
    ArrowUp:    (s) => [ [0], [0],  [s] ],
    ArrowDown:  (s) => [ [0], [0], [-s] ],
    ArrowLeft:  (s) => [ [-s], [0], [0] ],
    ArrowRight: (s) => [ [s], [0], [0] ],
    PageUp:     (s) => [ [0], [-s], [0] ],
    PageDown:   (s) => [ [0],  [s], [0] ]
};

const VIEW_VECTORS = {
    KeyW:  (s) => [[0], [0], [ s]], // forward
    KeyS:  (s) => [[0], [0], [-s]], // backward
    KeyA:  (s) => [[-s], [0], [0]], // left
    KeyD:  (s) => [[ s], [0], [0]], // right
    KeyQ:  (s) => [[0], [ s], [0]], // down
    KeyE:  (s) => [[0], [-s], [0]]  // up
};


let lastTime = performance.now();

function tick(now = performance.now()) {
    const dt = Math.min((now - lastTime) / 1000, 0.05); // seconds, clamp to avoid huge steps
    lastTime = now;

    moveCube(dt);
    controlView(dt)

    drawAll();
    requestAnimationFrame(tick);
}

function moveCube(dt) {
    // --- Tunables (per second) ---
    const cubeTurnRate   = 1.5;   // rad/s for R,P,Y
    const cubeMoveRate   = 1.0;   // units/s for arrows + PgUp/Dn

    // --- Cube rotation: local R/P/Y (hold keys to rotate continuously) ---
    let anyTurn = false;
    let dq = quatIdentity();
    const sign = shiftHeld ? -1 : 1;

    if (held.has('KeyR')) { dq = quatMultiply(dq, quatFromAxisAngle([0,0,1], sign * cubeTurnRate * dt)); anyTurn = true; };
    if (held.has('KeyP')) { dq = quatMultiply(dq, quatFromAxisAngle([1,0,0], sign * cubeTurnRate * dt)); anyTurn = true; };
    if (held.has('KeyY')) { dq = quatMultiply(dq, quatFromAxisAngle([0,1,0], sign * cubeTurnRate * dt)); anyTurn = true; };

    if (anyTurn) {
        const r = quatNormalize(quatMultiply(gameState.rotation, dq)); // local
        gameState.rotation = (r[0] < 0)? r.map(v => -v) : r;        
    }

    // --- Cube translation: arrows/PgUp/PgDown (sum multiple keys) ---
    const cubeLocal = localMoveFromKeysHeld(held, LOCAL_MOVE_VECTORS, cubeMoveRate * dt);
    if (cubeLocal[0] || cubeLocal[1] || cubeLocal[2]) {
        const world = quatRotateVector(gameState.rotation, cubeLocal);
        gameState.x += world[0]; gameState.y += world[1]; gameState.z += world[2];
    }
}

function controlView(dt) {
    // --- Tunables (per second) ---
    const camMoveRate    = 1.0;   // units/s for WASD + QE
    const zoomRate       = 250;   // pixels/s for Z

    // --- Camera translation: WASD/QE (sum multiple keys) ---
    const camLocal = localMoveFromKeysHeld(held, VIEW_VECTORS, camMoveRate * dt);
    if (camLocal[0] || camLocal[1] || camLocal[2]) {
        const world = quatRotateVector(viewState.rotation, camLocal);
        viewState.x += world[0]; viewState.y += world[1]; viewState.z += world[2];
    }

    // --- Zoom (continuous when Z held; Shift inverts) ---
    if (held.has('KeyZ')) {
        viewState.zoom += sign * zoomRate * dt;
    }
}

function localMoveFromKeysHeld(heldSet, vectorMap, step) {
    let x=0, y=0, z=0;
    for (const code of heldSet) {
        const gen = vectorMap[code];
        if (gen) {
            const vv = gen(step);
            x += vv[0][0]; y += vv[1][0]; z += vv[2][0];
        }
    }
    return [x,y,z];
}

function onPointerDown(e) {
    // Touch / pen path:
    activePointerId = e.pointerId;
    canvas.setPointerCapture(activePointerId);
    controlsEnabled = true;
    lastX = e.clientX;
    lastY = e.clientY;
}

function onPointerMove(e) {
    const sensitivity = (e.pointerType === 'mouse') ? 0.0025 : 0.004;
    let dx = 0, dy = 0;

    if (document.pointerLockElement === canvas && e.pointerType === 'mouse') {
        // Pointer Lock mouse: relative deltas provided
        dx = e.movementX || 0;
        dy = e.movementY || 0;
    } else if (e.pointerId === activePointerId) {
        // Touch/stylus: compute relative deltas from last
        dx = e.clientX - lastX;
        dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        e.preventDefault(); // keep blocking scroll while dragging
    } else {
        return;
    }

    // Apply yaw/pitch in local space
    const yawAngle   = dx * sensitivity;
    const pitchAngle = -dy * sensitivity;

    if (fpsMode) {
        // FPS: yaw about world-up, then pitch about camera-right
        const qYawWorld   = quatFromAxisAngle([0,1,0], yawAngle);
        let q = quatMultiply(qYawWorld, viewState.rotation); // pre-multiply = world axis
        const right = quatRotateVector(q, [1,0,0]);
        const qPitchRight = quatFromAxisAngle(right, pitchAngle);
        q = quatMultiply(qPitchRight, q);                    // pre-multiply (world axis)
        viewState.rotation = quatNormalize(q);
    } else {
        // Free-fly: local yaw then local pitch (right-multiply)
        let q = quatMultiply(viewState.rotation, quatFromAxisAngle([0,1,0], yawAngle));
        q = quatMultiply(q, quatFromAxisAngle([1,0,0], pitchAngle));
        viewState.rotation = quatNormalize(q);
    }

    if (viewState.rotation[0] < 0) {
        viewState.rotation = viewState.rotation.map(v => -v);
    }

    drawAll();
}

function onPointerUp(e) {
    if (e.pointerId === activePointerId) {
        canvas.releasePointerCapture(activePointerId);
        activePointerId = null;
        controlsEnabled = (document.pointerLockElement === canvas);
    }
}

function drawAll() {
    drawCube();
    drawCrosshairs();
}



function drawCube() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const R = quatToMatrix(gameState.rotation); // unit-safe
  const cx = gameState.x, cy = gameState.y, cz = gameState.z;

  // transform vertices (local -> world)
  const verts = new Array(CUBE_DEF.vertices.length);
  for (let i = 0; i < CUBE_DEF.vertices.length; i++) {
    const [x, y, z] = CUBE_DEF.vertices[i];
    const rx = x*R[0][0] + y*R[0][1] + z*R[0][2];
    const ry = x*R[1][0] + y*R[1][1] + z*R[1][2];
    const rz = x*R[2][0] + y*R[2][1] + z*R[2][2];
    verts[i] = [rx + cx, ry + cy, rz + cz];
  }

  drawVectors(CUBE_DEF.edges, verts, viewState);
}


function worldToCameraPoint(x, y, z, vs) {
  const dx = x - vs.x;
  const dy = y - vs.y;
  const dz = z - vs.z;

  const qInv = quatConjugate(vs.rotation);         // inverse of camera pose
  const [xc, yc, zc] = quatRotateVector(qInv, [dx, dy, dz]);
  return [xc, yc, zc];
}

function drawVectors(edges, verts, vs) {
    const w = canvas.width, h = canvas.height;
    const zoom = vs.zoom;

    ctx.beginPath();
    for (let eList of edges) {
        let started = false;
        for (const vi of eList) {
            const [xc, yc, zc] = worldToCameraPoint(verts[vi][0], verts[vi][1], verts[vi][2], vs);
            if (zc <= 0) { started = false; continue; }
            const safeZ = Math.max(zc, 0.01);
            const px = (xc / safeZ) * zoom + w/2;
            const py = (yc / safeZ) * zoom + h/2;

            if (started) {
                ctx.lineTo(px, py);
            } else {
                ctx.moveTo(px, py);
                started = true;
            }
        }
    }
    ctx.stroke();
    ctx.closePath();
}


function drawCrosshairs() {
    const w = canvas.width / 2;
    const h = canvas.height / 2;
    const sz = 10;

    ctx.beginPath();
    ctx.moveTo(w-sz, h);
    ctx.lineTo(w+sz, h);
    ctx.stroke();
    ctx.moveTo(w, h - sz);
    ctx.lineTo(w, h + sz);
    ctx.stroke();
    ctx.closePath();
}

