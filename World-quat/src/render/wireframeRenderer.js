import { quatConjugate, quatRotateVector } from "../math/quat.js";

export class WireframeRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    render(camera, entities, { withGrid = true } = {}) {
        const ctx = this.ctx;
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        ctx.clearRect(0, 0, w, h);
        if (withGrid) {
            drawGrid(ctx, camera);
        }

        for (const e of entities) {
            if (!e.shape) { continue; }
            drawMesh(ctx, camera, e);
        }

        drawCrosshair(ctx);
    }
}

// — helpers

function worldToCamera(p, cam) {
    const dx = p[0] - cam.position[0];
    const dy = p[1] - cam.position[1];
    const dz = p[2] - cam.position[2];
    const qInv = quatConjugate(cam.rotation);
    return quatRotateVector(qInv, [dx, dy, dz]);
}

function project([xc, yc, zc], cam, w, h) {
    const safeZ = Math.max(zc, cam.near);
    return [
        (xc / safeZ) * cam.zoom + w * 0.5,
        (yc / safeZ) * cam.zoom + h * 0.5
    ];
}

function drawMesh(ctx, cam, entity) {
    const { vertices, edges } = entity.shape;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    const vertsCam = vertices.map(([lx, ly, lz]) => {
        const sx = lx * entity.scale[0];
        const sy = ly * entity.scale[1];
        const sz = lz * entity.scale[2];
        const pw = entity.modelToWorld([sx, sy, sz]);   // local -> world
        return worldToCamera(pw, cam);                  // world -> camera
    });

    ctx.beginPath();
    for (const list of edges) {
        let started = false;
        for (const i of list) {
            const vc = vertsCam[i];
            if (vc[2] <= cam.near) {
                started = false;
                continue;
            }
            const px = (vc[0] / vc[2]) * cam.zoom + w * 0.5;
            const py = (vc[1] / vc[2]) * cam.zoom + h * 0.5;
            if (!started) {
                ctx.moveTo(px, py);
                started = true;
            } else {
                ctx.lineTo(px, py);
            }
        }
    }
    ctx.stroke();
}

function drawGrid(ctx, cam, size = 40, step = 2) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#789";
    ctx.beginPath();

    for (let x = -size; x <= size; x += step) {
        drawSegmentWorld(ctx, cam, [x, 0, -size], [x, 0, size]);
    }
    for (let z = -size; z <= size; z += step) {
        drawSegmentWorld(ctx, cam, [-size, 0, z], [size, 0, z]);
    }

    ctx.stroke();
    ctx.restore();
}

function drawSegmentWorld(ctx, cam, a, b) {
    const ac = worldToCamera(a, cam);
    const bc = worldToCamera(b, cam);
    const near = cam.near;

    const z1 = ac[2], z2 = bc[2];
    const in1 = z1 >= near, in2 = z2 >= near;

    if (!in1 && !in2) { return; }
    let p1 = ac, p2 = bc;

    if (in1 !== in2) {
        const t = (near - z1) / (z2 - z1);
        const xi = ac[0] + t * (bc[0] - ac[0]);
        const yi = ac[1] + t * (bc[1] - ac[1]);
        const zi = near;
        if (in1) {
            p2 = [xi, yi, zi];
        } else {
            p1 = [xi, yi, zi];
        }
    }

    const [w, h] = [ctx.canvas.width, ctx.canvas.height];
    const a2d = project(p1, cam, w, h);
    const b2d = project(p2, cam, w, h);
    ctx.moveTo(a2d[0], a2d[1]);
    ctx.lineTo(b2d[0], b2d[1]);
}

function drawCrosshair(ctx) {
    const w = ctx.canvas.width * 0.5;
    const h = ctx.canvas.height * 0.5;
    const s = 10;
    ctx.beginPath();
    ctx.strokeStyle = "#0d0";
    ctx.moveTo(w - s, h);
    ctx.lineTo(w + s, h);
    ctx.moveTo(w, h - s);
    ctx.lineTo(w, h + s);
    ctx.stroke();
}
