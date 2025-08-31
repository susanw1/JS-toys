import {
    quatIdentity,
    quatMultiply,
    quatNormalizePositive,
    quatFromAxisAngle,
    quatRotateVector
} from "../math/quat.js";
import { vadd } from "../math/vec3.js";

export class Entity {
    constructor(opts = {}) {
        this.position = opts.position ? opts.position.slice() : [0, 0, 0];
        this.rotation = opts.rotation ? opts.rotation.slice() : [1, 0, 0, 0]; // quat
        this.scale = opts.scale ? opts.scale.slice() : [1, 1, 1];

        // Generic knobs & runtime state
        this.params = opts.params || {};
        this.state = opts.state || {};

        // Optional shape for render/collision
        this.shape = opts.shape || null;

        // Tag/type for filtering (e.g., "cube", "shell", "machine")
        this.kind = opts.kind || "entity";
        this.alive = true;
    }

    update(dt, world) {
        // Default: no-op. Subclasses can override.
    }

    // --- Pure helpers ----------------------------------------------------

    // Rotate a local-space vector by this entity’s rotation (does not mutate).
    rotateVectorLocal(v3) {
        return quatRotateVector(this.rotation, v3);
    }

    // Convenience directions in world space.
    get forward() {
        return this.rotateVectorLocal([0, 0, 1]);
    }

    get right() {
        return this.rotateVectorLocal([1, 0, 0]);
    }

    get up() {
        return this.rotateVectorLocal([0, 1, 0]);
    }

    // Transform a local point to world space (rotation + translation).
    modelToWorld(vLocal) {
        const r = this.rotateVectorLocal(vLocal);
        return [ r[0] + this.position[0],
                 r[1] + this.position[1],
                 r[2] + this.position[2] ];
    }


    // --- Mutating helpers ------------------------------------------------

    // Translate in local space (e.g., [dx,dy,dz] in the entity’s frame).
    translateLocal(vLocal) {
        const w = this.rotateVectorLocal(vLocal);
        this.position = vadd(this.position, w);
    }

    // Rotate around a local axis by angle (right-multiply).
    rotateAroundLocal(axisLocal, angle) {
        const dq = quatFromAxisAngle(axisLocal, angle);
        this.rotation = quatNormalizePositive(quatMultiply(this.rotation, dq));
    }

    // Rotate around a world axis by angle (pre-multiply).
    rotateAroundWorld(axisWorld, angle) {
        const dq = quatFromAxisAngle(axisWorld, angle);
        this.rotation = quatNormalizePositive(quatMultiply(dq, this.rotation));
    }
}
