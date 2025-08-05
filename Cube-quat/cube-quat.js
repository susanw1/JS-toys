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
    const [x, y, z] = axis;
    const half = angle / 2;
    const s = Math.sin(half);
    return quatNormalize([Math.cos(half), x*s, y*s, z*s]);
}

// Rotate vector v by quaternion q
function quatRotateVector(q, v) {
    const [w, x, y, z] = q;
    const [vx, vy, vz] = v;
    const uvx  = 2 * (y * vz - z * vy);
    const uvy  = 2 * (z * vx - x * vz);
    const uvz  = 2 * (x * vy - y * vx);
    const uuvx = 2 * (y * uvz - z * uvy);
    const uuvy = 2 * (z * uvx - x * uvz);
    const uuvz = 2 * (x * uvy - y * uvx);
    return [
        vx + w * uvx + uuvx,
        vy + w * uvy + uuvy,
        vz + w * uvz + uuvz
    ];
}

function quatConjugate(q) {
    return [q[0], -q[1], -q[2], -q[3]];
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

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;


const CUBE_DEF = {
    vertices: [ [-1, -0.75, -1.5], [-1, -0.75, 1.5], [-1, 0.75, 1.5], [-1, 0.75, -1.5], 
        [1, -0.75, -1.5], [1, -0.75, 1.5], [1, 0.75, 1.5], [1, 0.75, -1.5], ],
    edges:  [[0,1,2,3,0,4,5,6,7,4], [1,5], [6,2], [3,7]]
};

startGame();

function startGame() {
    document.addEventListener("keydown", keyDownHandler);

    canvas.addEventListener("mousemove", moveViewPoint);
    
    canvas.addEventListener("mousedown", (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    canvas.addEventListener("mouseup", () => {
        isDragging = false;
    });

    canvas.addEventListener("mouseleave", () => {
        isDragging = false;
    });

    drawAll();
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

function keyDownHandler(e) {
    const dir = (event.shiftKey) ? -1 : 1; 
    const speed = 0.1; 
    const cubeSpeed = 0.1;

    const turnSpeed = 0.02;
    if (e.code === 'KeyR') {
        // roll around world Z
        const dq = quatFromAxisAngle([0, 0, 1], turnSpeed * dir);
        gameState.rotation = quatMultiply(dq, gameState.rotation);
    } else if (e.code === 'KeyP') {
        // pitch around world X
        const dq = quatFromAxisAngle([1, 0, 0], turnSpeed * dir);
        gameState.rotation = quatMultiply(dq, gameState.rotation);
    } else if (e.code === 'KeyY') {
        // yaw around world Y
        const dq = quatFromAxisAngle([0, 1, 0], turnSpeed * dir);
        gameState.rotation = quatMultiply(dq, gameState.rotation);
    }

    // Update cube movement: rotate local vector by cube’s quaternion
    const cvGen = LOCAL_MOVE_VECTORS[e.code];
    if (cvGen) {
        const cv = cvGen(cubeSpeed).map(arr => arr[0]); // flatten [[x],[y],[z]] to [x,y,z]
        const world = quatRotateVector(gameState.rotation, cv);
        gameState.x += world[0];
        gameState.y += world[1];
        gameState.z += world[2];
    }

    // Camera movement, using orientation
    const cameraSpeed = 0.1;

    const viewGen = VIEW_VECTORS[e.code];
    if (viewGen) {
        const vv = viewGen(cameraSpeed).map(arr => arr[0]);
        const worldMove = quatRotateVector(viewState.rotation, vv);
        viewState.x += worldMove[0];
        viewState.y += worldMove[1];
        viewState.z += worldMove[2];
    }

    if (e.code === 'KeyZ') {
        viewState.zoom += dir * 3;
    }

    drawAll();
}

function moveViewPoint(e) {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    const sensitivity = 0.005;
    const yawAngle   = dx * sensitivity;
    const pitchAngle = -dy * sensitivity;

    // yaw about world Y axis
    let qYaw = quatFromAxisAngle([0, 1, 0], yawAngle);
    // pitch about camera's right axis (local X)
    const right = quatRotateVector(viewState.rotation, [1, 0, 0]);
    let qPitch = quatFromAxisAngle(right, pitchAngle);

    // apply yaw then pitch
    viewState.rotation = quatMultiply(qPitch, quatMultiply(qYaw, viewState.rotation));

    drawAll();
}


function drawAll() {
    drawCube();
    drawCrosshairs();
}

function drawCube() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const verts = CUBE_DEF.vertices.map(([x,y,z]) => {
        const rotated = quatRotateVector(gameState.rotation, [x,y,z]);
        return [
            rotated[0] + gameState.x,
            rotated[1] + gameState.y,
            rotated[2] + gameState.z
        ];
    });

    drawVectors(CUBE_DEF.edges, verts, viewState);
}


// @param vec list of 3 (X, Y, Z) lists of points to be rotated in Roll(Y-X) Pitch(Z-Y) Yaw(X-Z) order. 
function rotate3Vector(vec, roll, pitch, yaw) {
    rotateAxis(roll, vec[1], vec[0]); // Y-X
    rotateAxis(pitch, vec[2], vec[1]); // Z-Y
    rotateAxis(yaw, vec[0], vec[1]); // X-Z
}

// Changes vertices array *in place*
function rotateAxis(angle, v1, v2) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const vDash = [];

    for (let i in v1) {
        const p1 = v1[i] * c + v2[i] * s;
        v2[i] = v2[i] * c - v1[i] * s;
        v1[i] = p1;
    }
}

// Transform world point to camera space using quaternion conjugate
function worldToCameraPoint(x, y, z, vs) {
    const dx = x - vs.x;
    const dy = y - vs.y;
    const dz = z - vs.z;
    const camInv = quatConjugate(vs.rotation); // inverse rotation
    return quatRotateVector(camInv, [dx, dy, dz]);
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
            const px = (xc / zc) * zoom + w / 2;
            const py = (yc / zc) * zoom + h / 2;
            if (started) {
                ctx.lineTo(px, py);
                ctx.stroke();
            } else {
                ctx.moveTo(px, py);
                started = true;
            }
        }
    }
    ctx.closePath();
}


function makeCameraMatrix(yaw, pitch, roll) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(roll), sr = Math.sin(roll);

    // Rotation order: Yaw → Pitch → Roll
    // This produces a 3×3 camera-to-world rotation matrix
    return [
        [   cy * cr + sy * sp * sr,    sr * cp,    -sy * cr + cy * sp * sr ],
        [   -cy * sr + sy * sp * cr,   cr * cp,    sr * sy + cy * sp * cr  ],
        [   sy * cp,                   -sp,        cy * cp                 ]
    ];
}

function worldToCamera(x, y, z, vs, camMatrix) {
    const dx = x - vs.x;
    const dy = y - vs.y;
    const dz = z - vs.z;

    return [
        dx * camMatrix[0][0] + dy * camMatrix[0][1] + dz * camMatrix[0][2],
        dx * camMatrix[1][0] + dy * camMatrix[1][1] + dz * camMatrix[1][2],
        dx * camMatrix[2][0] + dy * camMatrix[2][1] + dz * camMatrix[2][2]
    ];
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

