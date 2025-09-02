import { Entity } from "../core/entity.js";
import { quatFromAxisAngle, quatMultiply, quatNormalizePositive } from "../math/quat.js";

export class Cube extends Entity {
    constructor(opts = {}) {
        const defaults = {
            position: [0, 0, 5],
            rotation: [1, 0, 0, 0],
            kind: "cube",
            params: {
                turnRate: 1.5,         // rad/s
                moveRate: 1.0,         // units/s
                trackTurnRate: 0.8,    // rad/s when tracking
                rollStabilize: 2.0,    // rad/s toward world-up
                leadTime: 0.20
            },
            state: {
                tracking: false,
                velocity: [0, 0, 0]    // optional (world)
            },
        };
        super({ ...defaults, ...opts });
    }

    // Example local-space spin helper (optional)
    spinLocal(axis, radians) {
        const dq = quatFromAxisAngle(axis, radians);
        this.rotation = quatNormalizePositive(quatMultiply(this.rotation, dq));
    }

    update(dt, world) {
        // Put cube-specific AI/behaviour here (optional).
        // Your tracking logic can also live in a system (see app wiring).
    }
}
