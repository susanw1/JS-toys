import {
    transformPoint
} from "../math/transform.js";

export class WireframeRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    render(camera, entities, { withGrid = true } = {}) {
        const ctx = this.ctx;
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Hoist camera inverse per-frame
        const fWorldToCamera = camera.makeWorldToCamera();

        if (withGrid) {
            drawGrid(ctx, camera, fWorldToCamera);
        }

        for (const e of entities) {
            if (e.shape) {
                drawMeshAtEntity(ctx, camera, e, fWorldToCamera);
            }
            // NEW: draw fitted assets
            if (e.mounts) {
                for (const mountId in e.mounts) {
                    const m = e.mounts[mountId];
                    const a = m.asset;
                    if (a && a.mesh) {
                        drawMeshAtTransform(ctx, camera, a.mesh, fWorldToCamera, a.worldTransform());
                    }
                }
            }
        }

        drawCrosshair(ctx);
    }
}

// helpers
function project([xc, yc, zc], cam, w, h) {
    const safeZ = Math.max(zc, cam.near);
    return [(xc / safeZ) * cam.zoom + w * 0.5, h * 0.5 - (yc / safeZ) * cam.zoom];
}


function drawMeshAtEntity(ctx, cam, entity, fWorldToCamera) {
    drawMeshAtTransform(ctx, cam, entity.shape, fWorldToCamera, { pos: entity.position, rot: entity.rotation });
}

function drawMeshAtTransform(ctx, cam, mesh, fWorldToCamera, T) {
    const { vertices, edges } = mesh;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Local -> World -> Camera
    const vertsCam = vertices.map(vLocal => fWorldToCamera(transformPoint(T, vLocal)));

    ctx.beginPath();
    for (const list of edges) {
        // draw as segments with near-plane clipping
        for (let i = 1; i < list.length; i++) {
            const a = vertsCam[list[i - 1]];
            const b = vertsCam[list[i]];
            const seg = clipSegmentToNear(a, b, cam.near);
            if (seg) {
                const a2d = project(seg[0], cam, w, h);
                const b2d = project(seg[1], cam, w, h);
                ctx.moveTo(a2d[0], a2d[1]);
                ctx.lineTo(b2d[0], b2d[1]);
            }
        }
    }
    ctx.stroke();
}

function drawGrid(ctx, cam, fWorldToCamera, size = 40, step = 2) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#789";
    ctx.beginPath();

    for (let x = -size; x <= size; x += step) {
        drawSegmentWorld(ctx, cam, fWorldToCamera, [x, 0, -size], [x, 0, size]);
    }
    for (let z = -size; z <= size; z += step) {
        drawSegmentWorld(ctx, cam, fWorldToCamera, [-size, 0, z], [size, 0, z]);
    }

    ctx.stroke();
    ctx.restore();
}

function drawSegmentWorld(ctx, cam, fWorldToCamera, a, b) {
    const ac = fWorldToCamera(a);
    const bc = fWorldToCamera(b);
    const seg = clipSegmentToNear(ac, bc, cam.near);
    if (!seg) return;

    const [w, h] = [ctx.canvas.width, ctx.canvas.height];
    const a2d = project(seg[0], cam, w, h);
    const b2d = project(seg[1], cam, w, h);
    ctx.moveTo(a2d[0], a2d[1]);
    ctx.lineTo(b2d[0], b2d[1]);
}

function clipSegmentToNear(a, b, near) {
    const z1 = a[2], z2 = b[2];
    const in1 = z1 >= near, in2 = z2 >= near;
    if (!in1 && !in2) return null;
    if (in1 && in2) return [a, b];

    const t = (near - z1) / (z2 - z1);
    const xi = a[0] + t * (b[0] - a[0]);
    const yi = a[1] + t * (b[1] - a[1]);
    const zi = near;
    return in1 ? [a, [xi, yi, zi]] : [[xi, yi, zi], b];
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
