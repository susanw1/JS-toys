import {
    quatIdentity,
    quatMultiply,
    quatNormalize,
    quatFromAxisAngle,
    quatRotateVector
} from "../math/quat.js";
import { vadd } from "../math/vec3.js";

export class Entity {
    constructor({ position = [0, 0, 0], rotation = quatIdentity(), mesh = null } = {}) {
        this.position = position.slice(0, 3);
        this.rotation = rotation.slice(0, 4);
        this.mesh = mesh;    // { vertices, edges } | null
    }

    // local-space move: rotate local delta by current rot
    translateLocal(vLocal) {
        const w = quatRotateVector(this.rotation, vLocal);
        this.position = vadd(this.position, w);
    }

    // rotate around local axis
    rotateLocal(axisLocal, angle) {
        const dq = quatFromAxisAngle(axisLocal, angle);
        this.rotation = quatNormalize(quatMultiply(this.rotation, dq));
        if (this.rotation[0] < 0) {
            this.rotation = this.rotation.map(v => -v);
        }
    }

    // rotate around world axis
    rotateWorld(axisWorld, angle) {
        const dq = quatFromAxisAngle(axisWorld, angle);
        this.rotation = quatNormalize(quatMultiply(dq, this.rotation));
        if (this.rotation[0] < 0) {
            this.rotation = this.rotation.map(v => -v);
        }
    }

    forward() {
        return quatRotateVector(this.rotation, [0, 0, 1]);
    }

    right() {
        return quatRotateVector(this.rotation, [1, 0, 0]);
    }

    up() {
        return quatRotateVector(this.rotation, [0, 1, 0]);
    }

    modelToWorld(vLocal) {
        const r = quatRotateVector(this.rotation, vLocal);
        return [
            r[0] + this.position[0],
            r[1] + this.position[1],
            r[2] + this.position[2]
        ];
    }
}
