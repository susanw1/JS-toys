import { qconj } from "../math/quat.js";
import { vqrot } from "../math/vec3.js";
import { transformPoint, composeTransform } from "../math/transform.js";

export class WireframeRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    render(camera, entities, { withGrid = true } = {}) {
        const ctx = this.ctx;

        const dpr = window.devicePixelRatio || 1;
        const w = ctx.canvas.width  / dpr;
        const h = ctx.canvas.height / dpr;

        ctx.clearRect(0, 0, w, h);

        const fWorldToCamera = camera.makeWorldToCamera();

        if (withGrid) {
            drawGrid(ctx, camera, fWorldToCamera);
        }

        for (const e of entities) {
            drawAssetTree(ctx, camera, fWorldToCamera, e);
        }
        drawCrosshair(ctx);
    }
}

// Recursively draw all assets under a host (Entity or Asset)
function drawAssetTree(ctx, cam, fWorldToCamera, entity) {
    // Cache world transforms per asset during this draw
    const WT = new Map();

    // Root entity transform
    const Troot = { pos: entity.position, rot: entity.rotation };

    entity.iterateAssets((asset, info) => {
        let Tw;

        if (!info.parent) {
            // Root asset: world transform is the entity’s transform
            Tw = Troot;
        } else {
            // Compose parent WT ∘ mount ∘ local
            const parentTw = WT.get(info.parent);
            const mount    = info.parent.mounts[info.mountId];
            const Tpm      = composeTransform(parentTw, mount.transform);
            Tw             = composeTransform(Tpm, asset.local);
        }

        WT.set(asset, Tw);

        if (asset.mesh) {
            drawMeshAtTransform(ctx, cam, asset.mesh, fWorldToCamera, Tw);
        }
    });
}

function project([xc, yc, zc], cam, w, h) {
    const safeZ = Math.max(zc, cam.near);
    return [
        (xc / safeZ) * cam.zoom + w * 0.5,
        h * 0.5 - (yc / safeZ) * cam.zoom
    ];
}

function drawMeshAtTransform(ctx, cam, mesh, fWorldToCamera, T) {
    const { vertices, edges } = mesh;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    const vertsCam = vertices.map(vLocal =>
        fWorldToCamera(transformPoint(vLocal, T))
    );

    ctx.beginPath();
    for (const list of edges) {
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
    if (!seg) {
        return;
    }

    const [w, h] = [ctx.canvas.width, ctx.canvas.height];
    const a2d = project(seg[0], cam, w, h);
    const b2d = project(seg[1], cam, w, h);
    ctx.moveTo(a2d[0], a2d[1]);
    ctx.lineTo(b2d[0], b2d[1]);
}

function clipSegmentToNear(a, b, near) {
    const z1 = a[2], z2 = b[2];
    const in1 = z1 >= near, in2 = z2 >= near;
    if (!in1 && !in2) {
        return null;
    }
    if (in1 && in2) {
        return [a, b];
    }

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
