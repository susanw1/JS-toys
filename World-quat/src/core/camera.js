import { Entity } from "./entity.js";
import { quatConjugate, quatRotateVector } from "../math/quat.js";
import { vsub } from "../math/vec3.js";

export class Camera extends Entity {
    constructor(opts = {}) {
        super(opts);
        this.zoom = opts.zoom ?? 600;
        this.near = opts.near ?? 0.01;
    }

    // Capture qInv and position at call-time; per-frame callers should call once.
    makeWorldToCamera() {
        const qInv = quatConjugate(this.rotation);
        const camPos = this.position.slice();
        return (p) => {
            const d = vsub(p, camPos);
            return quatRotateVector(qInv, d);
        };
    }
}
