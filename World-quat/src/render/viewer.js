import { quatToMatrix } from "../math/quat.js";

export class Viewer {
    constructor(canvas, { drawGrid = true, strokeStyle = "#eee", gridColor = "#789" } = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.drawGrid = drawGrid;
        this.strokeStyle = strokeStyle;
        this.gridColor = gridColor;
    }

    clipCamSegmentNear(p1c, p2c, near) {
        const z1 = p1c[2];
        const z2 = p2c[2];
        const in1 = z1 >= near;
        const in2 = z2 >= near;

        if (!in1 && !in2) {
            return null;
        }
        if (in1 && in2) {
            return [p1c, p2c];
        }

        const t = (near - z1) / (z2 - z1);
        const xi = p1c[0] + t * (p2c[0] - p1c[0]);
        const yi = p1c[1] + t * (p2c[1] - p1c[1]);
        const zi = near;

        return in1 ? [p1c, [xi, yi, zi]] : [[xi, yi, zi], p2c];
    }

    drawWorldSegment(p1w, p2w, camera) {
        const p1c = camera.worldToCamera(p1w);
        const p2c = camera.worldToCamera(p2w);
        const seg = this.clipCamSegmentNear(p1c, p2c, camera.near);

        if (!seg) {
            return;
        }

        const a = camera.project(seg[0], this.canvas);
        const b = camera.project(seg[1], this.canvas);

        this.ctx.moveTo(a[0], a[1]);
        this.ctx.lineTo(b[0], b[1]);
    }

    drawGroundGrid(camera, size = 40, step = 2) {
        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = this.gridColor;
        ctx.globalAlpha = 0.5;

        for (let x = -size; x <= size; x += step) {
            this.drawWorldSegment([x, 0, -size], [x, 0, size], camera);
        }
        for (let z = -size; z <= size; z += step) {
            this.drawWorldSegment([-size, 0, z], [size, 0, z], camera);
        }

        ctx.stroke();
        ctx.restore();
    }

    drawWireMesh(entity, camera) {
        const { vertices, edges } = entity.mesh;
        const R = quatToMatrix(entity.rotation);

        // model -> world
        const vertsW = vertices.map(([x, y, z]) => {
            const rx = x * R[0][0] + y * R[0][1] + z * R[0][2];
            const ry = x * R[1][0] + y * R[1][1] + z * R[1][2];
            const rz = x * R[2][0] + y * R[2][1] + z * R[2][2];
            return [
                rx + entity.position[0],
                ry + entity.position[1],
                rz + entity.position[2]
            ];
        });

        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = this.strokeStyle;

        for (const eList of edges) {
            let started = false;

            for (const vi of eList) {
                const pCam = camera.worldToCamera(vertsW[vi]);

                if (pCam[2] <= camera.near) {
                    started = false;
                    continue;
                }

                const [x, y] = camera.project(pCam, this.canvas);

                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }

        ctx.stroke();
        ctx.restore();
    }

    drawCrosshair() {
        const ctx = this.ctx;
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const s = 10;

        ctx.beginPath();
        ctx.moveTo(cx - s, cy);
        ctx.lineTo(cx + s, cy);
        ctx.moveTo(cx, cy - s);
        ctx.lineTo(cx, cy + s);
        ctx.stroke();
        ctx.closePath();
    }

    render({ camera, entities = [], withGrid = true }) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (withGrid && this.drawGrid) {
            this.drawGroundGrid(camera);
        }
        for (const ent of entities) {
            if (ent.mesh) {
                this.drawWireMesh(ent, camera);
            }
        }
        this.drawCrosshair();
    }
}
