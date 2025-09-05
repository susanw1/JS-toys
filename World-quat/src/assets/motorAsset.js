import { Asset } from "./asset.js";
import { CAP } from "../core/caps.js";

export class MotorAsset extends Asset {
    constructor(opts = {}) {
        super({ kind: "motor", ...opts });

        // Speeds (units/sec, rad/sec)
        this.linearSpeed  = (opts.linearSpeed  ?? 3.0);
        this.angularSpeed = (opts.angularSpeed ?? 1.8);

        // If true, zero intents after applying each frame.
        this.clearIntentEachFrame = (opts.clearIntentEachFrame ?? true);

        // Intent accumulators (local space)
        this.intent = {
            move: [0, 0, 0],   // forward(+z), right(+x), up(+y)
            turn: [0, 0, 0]    // pitch(+x), yaw(+y), roll(+z)
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
    }

    // --- Frame update ----------------------------------------------------

    update(dt, world) {
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
            hostEntity.translateLocal(step);
        }

        // Apply rotation around local axes
        const tv = this.intent.turn;
        if (tv[0]) { hostEntity.rotateAroundLocal([1, 0, 0], tv[0] * this.angularSpeed * dt); }
        if (tv[1]) { hostEntity.rotateAroundLocal([0, 1, 0], tv[1] * this.angularSpeed * dt); }
        if (tv[2]) { hostEntity.rotateAroundLocal([0, 0, 1], tv[2] * this.angularSpeed * dt); }

        if (this.clearIntentEachFrame) {
            this.zeroIntent();
        }
    }

    // --- Private ---------------------------------------------------------


    // Private fields (none besides inherited)
}
