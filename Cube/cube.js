const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gameState = {
    yawAngle: 0,
    pitchAngle: 0,
    rollAngle: 0
};


const CUBE_DEF = {
    vertices: [ [-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [1, -1, -1], [1, -1, 1], [1, 1, 1], [1, 1, -1], ],
    edges:  [[0,1,2,3,0,4,5,6,7,4], [1,5], [6,2], [3,7]]
//    edges:  [[0,1], [1,2], [2,3], [3,0], [0,4], [1,5], [2,6], [3,7], [4,5], [5,6], [6,7], [7,4]]
};

startGame();

function startGame() {
    document.addEventListener("keydown", keyDownHandler);
    //document.addEventListener("mousemove", markBlobCreation);
    //document.addEventListener("mouseup", createBlobAtMouse);
    drawCube();
}

function keyDownHandler(e) {
    if (e.code == 'KeyR') {
        gameState.rollAngle += 0.01;
    } else if (e.code == 'KeyP') {
        gameState.pitchAngle += 0.01;
    } else if (e.code == 'KeyY') {
        gameState.yawAngle += 0.01;
    }
    drawCube();
}

function drawCube() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let v = [ CUBE_DEF.vertices.map(v => v[0]), CUBE_DEF.vertices.map(v => v[1]), CUBE_DEF.vertices.map(v => v[2])];
    rotateAxis(gameState.rollAngle, v[0], v[1]);
    rotateAxis(gameState.pitchAngle, v[2], v[1]);
    rotateAxis(gameState.yawAngle, v[2], v[0]);

    drawVectors(CUBE_DEF.edges, v);
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

function drawVectors(edges, vertices) {
    const w = canvas.width;
    const h = canvas.height;
    const scale = w/6;

    ctx.beginPath();        
    for (let eList of edges) {
        const e0 = eList[0];
        const x0 = vertices[0][e0] * scale + w/2;
        const y0 = vertices[1][e0] * scale + h/2;

        ctx.moveTo(x0, y0);

        for (let e of eList) {
            const x = vertices[0][e] * scale + w/2;
            const y = vertices[1][e] * scale + h/2;
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    }
    ctx.closePath();       
}


