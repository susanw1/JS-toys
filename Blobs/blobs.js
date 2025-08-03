const gameState = {
    blobs: [],
    newBlobs: []
};

const viewState = {
};

var  canvas;
var  ctx;

function startGame(cv) {
    canvas = cv;
    ctx = canvas.getContext("2d");
/*
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("touchstart", handleTouchStart);

    // Use 'document' to continue events when mouse moves out of the canvas, must record offset
    document.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchmove", handleTouchMove);

    document.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("touchcancel", handleTouchCancel);
*/
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointermove", handlePointerMove);

    mainLoop(0);
}


function mainLoop(t) {
    addNewBlobs();
    runModel();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw();

    requestAnimationFrame(mainLoop);
}

/*
function handleMouseDown(e) {
    recordPressOnCanvas(e.offsetX, e.offsetY, e.clientX, e.clientY);
    log(`mouse start`);
}

function handleTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    viewState.touchIdentifier = t.identifier;

    const bcr = e.target.getBoundingClientRect();
    log(`touch start bcr: ${bcr.x},${bcr.y} (t.offsetX=${t.offsetX})`);
    recordPressOnCanvas(t.clientX, t.clientY, bcr.x, bcr.y);
}
*/

function handlePointerDown(e) {
    log(`pointerdown x, y = ${e.offsetX}, ${e.offsetY}`);
    e.target.setPointerCapture(e.pointerId);
    e.preventDefault();
    recordPressOnCanvas(e.offsetX, e.offsetY, e.offsetX, e.offsetY);
}

var ccc = 0;
function handlePointerMove(e) {
    if (ccc++ % 100 == 0) log(`pointermove (${ccc})`);
    e.preventDefault();
    markProtoBlobCreation(e.offsetX, e.offsetY);
}

function handlePointerUp(e) {
    log(`pointerup x, y = ${e.offsetX}, ${e.offsetY}`);
    createBlobAtMouse(e.offsetX, e.offsetY);
}


/**
 * @param targetX the X location as seen by the target element (eg the canvas)
 * @param clientX the X location as seen by the viewPort (eg the canvas)
 */
function recordPressOnCanvas(targetX, targetY, clientX, clientY) {
    viewState.newBlobCreateX = viewState.newBlobClickX = targetX;
    viewState.newBlobCreateY = viewState.newBlobClickY = targetY;
    viewState.docOffsetX = clientX - targetX;
    viewState.docOffsetY =  clientY - targetY;

    log(`docOffset: ${viewState.docOffsetX}, ${viewState.docOffsetY}`);
    viewState.showNewBlob = true;
}

/*
function handleMouseMove(e) {
    markProtoBlobCreation(e.clientX, e.clientY);
}

function handleTouchMove(e) { 
    if (viewState.touchIdentifier === null) {
        return;
    }
    for (t of e.touches) {
        if (viewState.touchIdentifier == t.identifier) {
            markProtoBlobCreation(t.clientX, t.clientY);
            return;
        }
    }
}
*/
function markProtoBlobCreation(clientX, clientY) {
    if (viewState.showNewBlob) {
        viewState.newBlobCreateX = clientX - viewState.docOffsetX;
        viewState.newBlobCreateY = clientY - viewState.docOffsetY;
    }
}

/*
function handleMouseUp(e) {
    createBlobAtMouse(e.clientX, e.clientY);
}

function handleTouchCancel() {
    log(`touch cancel`);
    viewState.showNewBlob = false;
}

function handleTouchEnd(e) {
    if (viewState.touchIdentifier === null) {
        return;
    }

    e.preventDefault();
    for (t of e.changedTouches) {
        if (viewState.touchIdentifier == t.identifier) {
            createBlobAtMouse(t.clientX, t.clientY);
            viewState.touchIdentifier = null;
            return;
        }
    }
}
*/

function createBlobAtMouse(clientX, clientY) {
    if (viewState.showNewBlob) {
        const x = clientX - viewState.docOffsetX; 
        const y = clientY - viewState.docOffsetY; 

        const dx = (viewState.newBlobClickX - x) / 10;
        const dy = (viewState.newBlobClickY - y) / 10;
        createBlob(x, y, dx, dy);
        viewState.showNewBlob = false;
        log(`New blob at ${x},${y}`);
    }
}

function createBlob(x, y, dx, dy) {
    gameState.newBlobs.push(new Blob(x, y, dx, dy, 20));
}

function addNewBlobs() {
    if (gameState.newBlobs) {
        gameState.blobs.push(...gameState.newBlobs);
        gameState.newBlobs.length = 0;
    }
}

function runModel() {
    gameState.blobs.forEach(e => e && e.move(canvas.width, canvas.height));

    let blobs = gameState.blobs;
    let purge = false;

    // would be nice to do this less manually, but too many cases
    for (let i = 0; i < blobs.length; i++) {
        let e1 = blobs[i];
        if (e1 && e1.alive) {
            for (let j = i + 1; j < blobs.length; j++) {
                let e2 = blobs[j];
                if (e2 && e2.alive) {
                    collision(e1, e2);
                }
            }
        } else {
            purge = true;
        }
    }

    // purge
    if (purge) {
        doPurge();
    }
}

function doPurge() {
    let blobs = gameState.blobs;

    for (let i = blobs.length - 1; i >= 0; i--) {
        let e1 = blobs[i];
        if (!e1 || !e1.alive) {
            let replacement = blobs.pop();
            if (i < blobs.length) {
               blobs[i] = replacement;
            } 
        }
    }    
}

function collision(e1, e2) {
    // Axis-aligned collision detect
    if (e1.x + e1.rad > e2.x - e2.rad && e1.x - e1.rad < e2.x + e2.rad 
            && e1.y + e1.rad > e2.y - e2.rad && e1.y - e1.rad < e2.y + e2.rad) {
        let xx = e1.x - e2.x;
        let yy = e1.y - e2.y;
        let rr = e1.rad + e2.rad;
        // Radius collision detect
        if (xx * xx + yy * yy < rr * rr) {
            e1.merge(e2);
        }
    }
}

function draw() {
    if (viewState.showNewBlob) {
        drawProtoBlob();
    } 

    gameState.blobs.forEach(e => e && e.draw());
}

function drawProtoBlob() {
    ctx.beginPath();
    ctx.arc(viewState.newBlobCreateX, viewState.newBlobCreateY, 20, 0, Math.PI * 2, false);
    ctx.fillStyle = "#ccc";
    ctx.fill();

    ctx.moveTo(viewState.newBlobCreateX, viewState.newBlobCreateY);
    ctx.lineTo(viewState.newBlobClickX, viewState.newBlobClickY);
    ctx.stroke();
    ctx.closePath();   
}

class Blob {
    constructor(x, y, dx, dy, rad) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.rad = rad;
        this.alive = true;
    }

    merge(e) {
        let mass1 = this.rad * this.rad;
        let mass2 = e.rad * e.rad;
        let newMass = mass1 + mass2;
        this.rad = Math.sqrt(newMass);
        this.x = (this.x * mass1 + e.x * mass2) / newMass;
        this.y = (this.y * mass1 + e.y * mass2) / newMass;
        this.dx = (this.dx * mass1 + e.dx * mass2) / newMass;
        this.dy = (this.dy * mass1 + e.dy * mass2) / newMass;
        e.alive = false;
    }

    move(xMax, yMax) {
        if (this.x - this.rad < 0 && this.dx < 0 || this.x + this.rad > xMax && this.dx > 0) {
            this.dx = -this.dx;
        }
        if (this.y - this.rad < 0 && this.dy < 0 || this.y + this.rad > yMax && this.dy > 0) {
            this.dy = -this.dy;
        }
        this.x += this.dx;
        this.y += this.dy;
    }
    
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.rad, 0, Math.PI * 2, false);
        ctx.fillStyle = "#00FF00";
        ctx.fill();
        ctx.closePath();
    }
}

function log(msg) {
    const container = document.getElementById("log");
    container.textContent = `${msg} \n${container.textContent}`;
}
