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
    x: 0,
    y: 0,
    z: 0,
    
    yawAngle: 0,
    pitchAngle: 0,
    rollAngle: 0,
    zoom: 500
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

    // Movement based on camera orientation
    const yaw = viewState.yawAngle;
    const pitch = viewState.pitchAngle;

    // Forward direction
    const fx = Math.cos(pitch) * Math.sin(yaw);
    const fy = -Math.sin(pitch);
    const fz = Math.cos(pitch) * Math.cos(yaw);

    // Right (strafe) direction: cross of forward and world-up (0,1,0)
    const rx = Math.cos(yaw);
    const ry = 0;
    const rz = -Math.sin(yaw);

    // WASD keys move relative to current view
    if (e.code === 'KeyW') {
        viewState.x += fx * speed;
        viewState.y += fy * speed;
        viewState.z += fz * speed;
    } else if (e.code === 'KeyS') {
        viewState.x -= fx * speed;
        viewState.y -= fy * speed;
        viewState.z -= fz * speed;
    } else if (e.code === 'KeyA') {
        viewState.x -= rx * speed;
        viewState.y -= ry * speed;
        viewState.z -= rz * speed;
    } else if (e.code === 'KeyD') {
        viewState.x += rx * speed;
        viewState.y += ry * speed;
        viewState.z += rz * speed;
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
    rotateAxis(gameState.rollAngle, vec[1], vec[0]); // Y-X
    rotateAxis(gameState.pitchAngle, vec[2], vec[1]); // Z-Y
    rotateAxis(gameState.yawAngle, vec[2], vec[0]); // Z-X

    // ... b) offset it into the world
    for (let i in vec[0]) {
        vec[0][i] += gameState.x;
        vec[1][i] += gameState.y;
        vec[2][i] += gameState.z;
    }
    
    drawVectors(CUBE_DEF.edges, vec, viewState);
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

