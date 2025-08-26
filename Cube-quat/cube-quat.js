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
  return [Math.cos(half), x*s, y*s, z*s];  // unit quat if axis is unit
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
    // passive:false to ensure key handler can preventDefault() to avoid unwanted page scrolls in all browsers
    document.addEventListener("keydown", keyDownHandler, { passive: false });

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
        // roll around local Z
        dq = quatFromAxisAngle([0, 0, 1], turnSpeed * dir);
    } else if (e.code === 'KeyP') {
        // pitch around local X
        dq = quatFromAxisAngle([1, 0, 0], turnSpeed * dir);
    } else if (e.code === 'KeyY') {
        // yaw around local Y
        dq = quatFromAxisAngle([0, 1, 0], turnSpeed * dir);
    }
    if (dq) {
        gameState.rotation = quatNormalize(quatMultiply(gameState.rotation, dq)); // local-space
    }


    // Update cube movement: rotate local vector by cube’s quaternion
    const cvGen = LOCAL_MOVE_VECTORS[e.code];
    if (cvGen) {
        e.preventDefault();
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
    const r = quatNormalize(quatMultiply(viewState.rotation, localTurn));

    viewState.rotation = (r[0] < 0)? r.map(v => -v) : r;
    drawAll();
}


function drawAll() {
    drawCube();
    drawCrosshairs();
}


function quatToMatrix(q) {
  // SAFETY: guard against slight drift — normalize first or scale by s
  let [w, x, y, z] = q;
  const s2 = w*w + x*x + y*y + z*z;
  if (Math.abs(1 - s2) > 1e-6) {
    const inv = 1 / Math.sqrt(s2);
    w*=inv; x*=inv; y*=inv; z*=inv;
  }

  return [
    [1 - 2*(y*y + z*z), 2*(x*y - z*w),   2*(x*z + y*w)],
    [2*(x*y + z*w),     1 - 2*(x*x + z*z), 2*(y*z - x*w)],
    [2*(x*z - y*w),     2*(y*z + x*w),   1 - 2*(x*x + y*y)]
  ];
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

