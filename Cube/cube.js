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


const CUBE_DEF = {
    vertices: [ [-1, -0.75, -1.5], [-1, -0.75, 1.5], [-1, 0.75, 1.5], [-1, 0.75, -1.5], 
        [1, -0.75, -1.5], [1, -0.75, 1.5], [1, 0.75, 1.5], [1, 0.75, -1.5], ],
    edges:  [[0,1,2,3,0,4,5,6,7,4], [1,5], [6,2], [3,7]]
};

startGame();

function startGame() {
    document.addEventListener("keydown", keyDownHandler);
    document.addEventListener("mousemove", moveViewPoint);

    drawCube();
}

function keyDownHandler(e) {
    let dir = (event.shiftKey) ? -1 : 1; 

    // Cube rotation: RPY
    if (e.code == 'KeyR') {
        gameState.rollAngle += 0.01 * dir;
    } else if (e.code == 'KeyP') {
        gameState.pitchAngle += 0.01 * dir;
    } else if (e.code == 'KeyY') {
        gameState.yawAngle += 0.01 * dir;
    }

    // Viewpoint movement: WASD
    const rc = Math.cos(viewState.rollAngle);
    const rs = Math.sin(viewState.rollAngle);
    const pc = Math.cos(viewState.pitchAngle);
    const ps = Math.sin(viewState.pitchAngle);
    const yc = Math.cos(viewState.yawAngle);
    const ys = Math.sin(viewState.yawAngle);
// ....
    

// this needs to take into account view direction!
    if (e.code == 'KeyA') {
        viewState.x -= 0.1;
    } else if (e.code == 'KeyD') {
        viewState.x += 0.1;
    } else if (e.code == 'KeyS') {
        viewState.y += 0.1;
    } else if (e.code == 'KeyW') {
        viewState.y -= 0.1;
    }

    if (e.code == 'KeyZ') {
        viewState.zoom += dir;
    }

    drawCube();
}

function moveViewPoint(e) {
    
}


function drawCube() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // copy raw vector position to a scratch array and a) rotate it to current angles, and ...
    let vec = [ CUBE_DEF.vertices.map(v => v[0]), 
        CUBE_DEF.vertices.map(v => v[1]), 
        CUBE_DEF.vertices.map(v => v[2])];
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

    
    ctx.beginPath();
    for (let eList of edges) {
        const e0 = eList[0];
        const x0 = (vertices[0][e0] - vs.x) / (vertices[2][e0] - vs.z) * zoom + w/2;
        const y0 = (vertices[1][e0] - vs.y) / (vertices[2][e0] - vs.z) * zoom + h/2;
//         console.log(`x: ${x0}, y: ${y0}`);
        ctx.moveTo(x0, y0);

        for (let e of eList) {
            const x = (vertices[0][e] - vs.x) / (vertices[2][e] - vs.z)  * zoom + w/2;
            const y = (vertices[1][e] - vs.y) / (vertices[2][e] - vs.z) * zoom + h/2;
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    }
    ctx.closePath();       
}


