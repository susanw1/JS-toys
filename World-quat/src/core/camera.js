import { Entity } from "./entity.js";
import { quatConjugate, quatRotateVector } from "../math/quat.js";
import { vsub } from "../math/vec3.js";

export class Camera extends Entity {
    constructor(opts = {}) {
        super(opts);
        this.zoom = opts.zoom ?? 600;
        this.near = opts.near ?? 0.01;
    }

    // Create a closure that captures qInv and camPos at call time.
    // Call once per frame from the renderer.
    makeWorldToCamera() {
        const qInv = quatConjugate(this.rotation);
        const camPos = this.position.slice();
        return (p) => {
            const d = vsub(p, camPos);
            return quatRotateVector(qInv, d);
        };
    }
}
