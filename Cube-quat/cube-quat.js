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

    // Prevent the browser from starting a native drag on the canvas
    canvas.addEventListener('dragstart', (event) => {
        event.preventDefault();
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
    let dq = null;
    if (e.code === 'KeyR') {
        // roll around world Z
        dq = quatFromAxisAngle([0, 0, 1], turnSpeed * dir);
    } else if (e.code === 'KeyP') {
        // pitch around world X
        dq = quatFromAxisAngle([1, 0, 0], turnSpeed * dir);
    } else if (e.code === 'KeyY') {
        // yaw around world Y
        dq = quatFromAxisAngle([0, 1, 0], turnSpeed * dir);
    }
    if (dq) {
        gameState.rotation = quatMultiply(gameState.rotation, dq); // local-space
        gameState.rotation = quatNormalize(gameState.rotation);        
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

    // Step 1: yaw around local Y
    const localYaw = quatFromAxisAngle([0, 1, 0], yawAngle);

    // Step 2: pitch around local X
    const localPitch = quatFromAxisAngle([1, 0, 0], pitchAngle);

    // Step 3: combine local rotations (yaw then pitch)
    const localTurn = quatMultiply(localYaw, localPitch);

    // Step 4: apply to camera rotation in local space
    viewState.rotation = quatMultiply(viewState.rotation, localTurn);
    viewState.rotation = quatNormalize(viewState.rotation);

    drawAll();
}


function drawAll() {
    drawCube();
    drawCrosshairs();
}

// delete me
function quatToMatrix(q) {
    const [w, x, y, z] = q;
    return [
        [1 - 2*(y*y + z*z), 2*(x*y - z*w), 2*(x*z + y*w)],
        [2*(x*y + z*w), 1 - 2*(x*x + z*z), 2*(y*z - x*w)],
        [2*(x*z - y*w), 2*(y*z + x*w), 1 - 2*(x*x + y*y)]
    ];
}

function drawCube1() {
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

function drawCube() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rot = quatToMatrix(gameState.rotation);
    const cx = gameState.x, cy = gameState.y, cz = gameState.z;

    const verts = CUBE_DEF.vertices.map(([x, y, z]) => {
        // Shift vertex relative to cube center
        const dx = x;
        const dy = y;
        const dz = z;

        // Rotate
        const rx = dx * rot[0][0] + dy * rot[0][1] + dz * rot[0][2];
        const ry = dx * rot[1][0] + dy * rot[1][1] + dz * rot[1][2];
        const rz = dx * rot[2][0] + dy * rot[2][1] + dz * rot[2][2];

        // Translate to world position
        return [rx + cx, ry + cy, rz + cz];
    });

    drawVectors(CUBE_DEF.edges, verts, viewState);
}

// Transform world point to camera space using quaternion conjugate
function worldToCameraPoint(x, y, z, vs) {
    const dx = x - vs.x;
    const dy = y - vs.y;
    const dz = z - vs.z;

    const q = vs.rotation;
    const [w, xq, yq, zq] = q;

    // Camera forward vector (Z+)
    const fx = 2 * (xq*zq + w*yq);
    const fy = 2 * (yq*zq - w*xq);
    const fz = 1 - 2 * (xq*xq + yq*yq);

    // Camera right vector (X+)
    const rx = 1 - 2 * (yq*yq + zq*zq);
    const ry = 2 * (xq*yq + w*zq);
    const rz = 2 * (xq*zq - w*yq);

    // Camera up vector (Y+)
    const ux = 2 * (xq*yq - w*zq);
    const uy = 1 - 2 * (xq*xq + zq*zq);
    const uz = 2 * (yq*zq + w*xq);

    // Project into camera space via dot products
    const xc = dx * rx + dy * ry + dz * rz;
    const yc = dx * ux + dy * uy + dz * uz;
    const zc = dx * fx + dy * fy + dz * fz;

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

