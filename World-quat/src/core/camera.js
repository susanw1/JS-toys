import { Entity } from "./entity.js";
import { quatConjugate, quatRotateVector } from "../math/quat.js";

export class Camera extends Entity {
    constructor(opts = {}) {
        super(opts);
        this.zoom = opts.zoom ?? 600;
        this.near = opts.near ?? 0.01;
    }

    worldToCamera(pWorld) {
        const dx = pWorld[0] - this.position[0];
        const dy = pWorld[1] - this.position[1];
        const dz = pWorld[2] - this.position[2];
        const qInv = quatConjugate(this.rotation);
        return quatRotateVector(qInv, [dx, dy, dz]);    // [xc, yc, zc]
    }

    project([xc, yc, zc], canvas) {
        return [
            (xc / zc) * this.zoom + canvas.width / 2,
            (yc / zc) * this.zoom + canvas.height / 2
        ];
    }
}
