const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gameState = {
    x: 0,
    y: 0,
    z: 5,
    yawAngle: 0,
    pitchAngle: 0,
    rollAngle: 0
};

const viewState = {
    x: 5,
    y: 0,
    z: 5,
    
    yawAngle: -Math.PI / 2,
    pitchAngle: 0,
    rollAngle: 0,
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

    // Cube rotation: RPY
    if (e.code === 'KeyR') {
        gameState.rollAngle += speed * 0.2 * dir;
    } else if (e.code === 'KeyP') {
        gameState.pitchAngle += speed * 0.2 * dir;
    } else if (e.code === 'KeyY') {
        gameState.yawAngle += speed * 0.2 * dir;
    }

    // Cube movement: arrows
    const cubeSpeed = 0.1;
    const cvGen = LOCAL_MOVE_VECTORS[e.code];
    if (cvGen) {
        const cv = cvGen(cubeSpeed);
        rotate3Vector(cv, gameState.rollAngle, gameState.pitchAngle, gameState.yawAngle);
        gameState.x += cv[0][0];
        gameState.y += cv[1][0];
        gameState.z += cv[2][0];
    }


    // Camera movement, using orientation
    const cameraSpeed = 0.1;
    const viewGen = VIEW_VECTORS[e.code];
    if (viewGen) {
        const vv = viewGen(cameraSpeed);
        rotate3Vector(vv, viewState.rollAngle, viewState.pitchAngle, viewState.yawAngle);
        viewState.x += vv[0][0];
        viewState.y += vv[1][0];
        viewState.z += vv[2][0];
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

    viewState.yawAngle += dx * sensitivity;
    viewState.pitchAngle -= dy * sensitivity;

    // Clamp pitch to avoid flipping over
    const maxPitch = Math.PI / 2 - 0.01;
    if (viewState.pitchAngle > maxPitch) viewState.pitchAngle = maxPitch;
    if (viewState.pitchAngle < -maxPitch) viewState.pitchAngle = -maxPitch;

    drawAll();
}

function drawAll() {
    drawCube();
    drawCrosshairs();
}

function drawCube() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // copy raw vector position to a scratch array and a) rotate it to current angles, and ...
    let vec = [ CUBE_DEF.vertices.map(v => v[0]), 
            CUBE_DEF.vertices.map(v => v[1]), 
            CUBE_DEF.vertices.map(v => v[2])
        ];

    rotate3Vector(vec, gameState.rollAngle, gameState.pitchAngle, gameState.yawAngle);

    // ... b) offset it into the world
    for (let i in vec[0]) {
        vec[0][i] += gameState.x;
        vec[1][i] += gameState.y;
        vec[2][i] += gameState.z;
    }
    
    drawVectors(CUBE_DEF.edges, vec, viewState);
}

// @param vec list of 3 (X, Y, Z) lists of points to be rotated in Roll(Y-X) Pitch(Z-Y) Yaw(Z-X) order. 
function rotate3Vector(vec, roll, pitch, yaw) {
    rotateAxis(roll, vec[1], vec[0]); // Y-X
    rotateAxis(pitch, vec[2], vec[1]); // Z-Y
    rotateAxis(yaw, vec[2], vec[0]); // Z-X
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

function drawVectors(edges, vertices, vs) {
    const w = canvas.width;
    const h = canvas.height;
    const zoom = vs.zoom;

    const camMatrix = makeCameraMatrix(vs.yawAngle, vs.pitchAngle, vs.rollAngle);
    
    ctx.beginPath();
    for (let eList of edges) {
        let started = false;

        for (let i = 0; i < eList.length; i++) {
            const e = eList[i]; 
            const [xc, yc, zc] = worldToCamera(vertices[0][e], vertices[1][e], vertices[2][e], vs, camMatrix);   
            if (zc <= 0) {
                started = false;
            } else {
                const x = (xc / zc) * zoom + w / 2;
                const y = (yc / zc) * zoom + h / 2;

                if (started) {
                    ctx.lineTo(x, y);
                    ctx.stroke();
                } else {
                    ctx.moveTo(x, y);
                    started = true;
                }
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

