import { Asset } from "./asset.js";
import { CAP } from "../core/caps.js";
import { vadd } from "../math/vec3.js";

export class MotorAsset extends Asset {
    constructor(opts = {}) {
        super({ kind: "motor", ...opts });

        // Speeds (units/sec, rad/sec)
        this.linearSpeed  = (opts.linearSpeed  ?? 3.0);
        this.angularSpeed = (opts.angularSpeed ?? 1.8);

        this.space = (opts.space || "local");      // "local" | "world"
        this.worldUpYaw = !!opts.worldUpYaw;       // yaw about world +Y

        // If true, zero intents after applying each frame.
        this.clearIntentEachFrame = (opts.clearIntentEachFrame ?? true);

        // Intent accumulators (local space)
        this.intent = {
            move: [0, 0, 0],   // forward(+z), right(+x), up(+y)
            turn: [0, 0, 0],   // pitch(+x), yaw(+y), roll(+z)
            turnRad: [0, 0, 0] // direct radians; applied as-is
        };
    }

    getCapabilities() {
        return { [CAP.motor]: true };
    }

    // --- Public helpers --------------------------------------------------

    addMove(dx = 0, dy = 0, dz = 0) {
        this.intent.move[0] += dx;
        this.intent.move[1] += dy;
        this.intent.move[2] += dz;
    }

    addTurn(dp = 0, dyaw = 0, dr = 0) {
        this.intent.turn[0] += dp;
        this.intent.turn[1] += dyaw;
        this.intent.turn[2] += dr;
    }

    zeroIntent() {
        this.intent.move[0] = this.intent.move[1] = this.intent.move[2] = 0;
        this.intent.turn[0] = this.intent.turn[1] = this.intent.turn[2] = 0;
        this.intent.turnRad[0] = this.intent.turnRad[1] = this.intent.turnRad[2] = 0;
    }

    // --- Frame update ----------------------------------------------------

    update(dt) {
        const hostEntity = this.getHostEntity();
        if (!hostEntity) {
            if (this.clearIntentEachFrame) { this.zeroIntent(); }
            return;
        }

        // Apply translation in local frame
        const mv = this.intent.move;
        if (mv[0] || mv[1] || mv[2]) {
            const step = [
                mv[0] * this.linearSpeed * dt,
                mv[1] * this.linearSpeed * dt,
                mv[2] * this.linearSpeed * dt
            ];
            if (this.space === "world") {
                // move in world axes
                hostEntity.position = vadd(hostEntity.position, step);
            } else {
                // move in local axes
                hostEntity.translateLocal(step);
            }
        }

        // Apply rotation around local axes
        const tv = this.intent.turn;
        const yaw = tv[1] * this.angularSpeed * dt;
        const pitch = tv[0] * this.angularSpeed * dt;
        const roll = tv[2] * this.angularSpeed * dt;

        if (pitch) { hostEntity.rotateAroundLocal([1, 0, 0], pitch); }
        if (roll)  { hostEntity.rotateAroundLocal([0, 0, 1], roll); }

        if (yaw) {
            if (this.worldUpYaw) {
                hostEntity.rotateAroundWorld([0, 1, 0], yaw);
            } else {
                hostEntity.rotateAroundLocal([0, 1, 0], yaw);
            }
        }

        // ----- rotation (direct radians) -----
        const tr = this.intent.turnRad;
        if (tr[0]) { hostEntity.rotateAroundLocal([1, 0, 0], tr[0]); }
        if (tr[2]) { hostEntity.rotateAroundLocal([0, 0, 1], tr[2]); }
        if (tr[1]) {
            if (this.worldUpYaw) {
                hostEntity.rotateAroundWorld([0, 1, 0], tr[1]);
            } else {
                hostEntity.rotateAroundLocal([0, 1, 0], tr[1]);
            }
        }

        if (this.clearIntentEachFrame) {
            this.zeroIntent();
        }
    }

    // --- Private ---------------------------------------------------------


    // Private fields (none besides inherited)
}
