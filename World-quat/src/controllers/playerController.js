import { quatFromAxisAngle, quatMultiply, quatNormalizePositive, quatRotateVector } from "../math/quat.js";
import { vadd } from "../math/vec3.js";

const LOCAL_MOVE_VECTORS = {
    ArrowUp:    [ 0,  0,  1],
    ArrowDown:  [ 0,  0, -1],
    ArrowLeft:  [-1,  0,  0],
    ArrowRight: [ 1,  0,  0],
    PageUp:     [ 0,  1,  0],
    PageDown:   [ 0, -1,  0],
};

function localMoveFromHeld(held, map, step) {
    let x = 0, y = 0, z = 0;
    for (const code of held) {
        const v = map[code];
        if (v) { x += v[0] * step; y += v[1] * step; z += v[2] * step; }
    }
    return [x, y, z];
}

export class PlayerController {
    constructor(entity, input, tune) {
        this.entity = entity;
        this.input = input;
        this.tune = tune;
    }

    step(dt) {
        const e = this.entity;
        const held = this.input.held;
        const sign = this.input.shift ? -1 : 1;
        const turnRate = e.params.turnRate;
        const moveRate = e.params.moveRate;

        // rotations R/P/Y
        let dq = null;
        if (held.has("KeyR")) { dq = (dq ?? [1,0,0,0]); dq = quatMultiply(dq, quatFromAxisAngle([0,0,1], sign * turnRate * dt)); }
        if (held.has("KeyP")) { dq = (dq ?? [1,0,0,0]); dq = quatMultiply(dq, quatFromAxisAngle([1,0,0], sign * turnRate * dt)); }
        if (held.has("KeyY")) { dq = (dq ?? [1,0,0,0]); dq = quatMultiply(dq, quatFromAxisAngle([0,1,0], sign * turnRate * dt)); }
        if (dq) {
            e.rotation = quatNormalizePositive(quatMultiply(e.rotation, dq));
            if (!Number.isFinite(e.rotation[0] + e.rotation[1] + e.rotation[2] + e.rotation[3])) {
                console.warn("Bad quaternion", e.rotation);
            }
        }

        // translation by arrows
        const vLocal = localMoveFromHeld(held, LOCAL_MOVE_VECTORS, moveRate * dt);
        if (vLocal[0] || vLocal[1] || vLocal[2]) {
            const world = quatRotateVector(e.rotation, vLocal);
            e.position = vadd(e.position, world);
        }
    }
}
