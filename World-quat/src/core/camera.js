import { Entity } from "./entity.js";
import { quatConjugate, quatRotateVector } from "../math/quat.js";
import { vsub } from "../math/vec3.js";

export class Camera extends Entity {
    constructor(opts = {}) {
        super(opts);
        this.zoom = opts.zoom ?? 600;
        this.near = opts.near ?? 0.01;
    }

    makeWorldToCamera() {
        return (p) => {
            const qInv = quatConjugate(this.rotation);
            const d = vsub(p, this.position);
            return quatRotateVector(qInv, d);
        };
    }
}
