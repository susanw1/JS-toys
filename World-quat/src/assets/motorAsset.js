// src/assets/motorAsset.js
import { Asset } from "./asset.js";
import { CAP } from "../core/caps.js";
import { vaddp, vscale, vzerop } from "../math/vec3.js";

export class MotorAsset extends Asset {
    constructor(opts = {}) {
        super({ kind: "motor", ...opts });

        // Speeds (units/sec, rad/sec)
        this.linearSpeed  = (opts.linearSpeed  ?? 3.0);
        this.angularSpeed = (opts.angularSpeed ?? 1.8);

        // How to apply movement/turn
        this.space = (opts.space || "local");   // "local" | "world"
        this.worldUpYaw = !!opts.worldUpYaw;    // yaw about world +Y

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

    addTurnRadians(dp = 0, dyaw = 0, dr = 0) {
        this.intent.turnRad[0] += dp;
        this.intent.turnRad[1] += dyaw;
        this.intent.turnRad[2] += dr;
    }

    zeroIntent() {
        const i = this.intent;
        vzerop(i.move);
        vzerop(i.turn);
        vzerop(i.turnRad);
    }

    update(dt) {
        const hostEntity = this.getHostEntity();
        if (!hostEntity) {
            if (this.clearIntentEachFrame) { this.zeroIntent(); }
            return;
        }

        // Apply translation in local frame
        const mv = this.intent.move;
        if (mv[0] || mv[1] || mv[2]) {
            const step = vscale(mv, this.linearSpeed * dt);
            if (this.space === "world") {
                // move in world axes
                vaddp(hostEntity.position, step);
            } else {
                // move in local axes
                hostEntity.translateLocal(step);
            }
        }

        // ----- rotation (unitless → radians) -----
        const tu = this.intent.turn;
        if (tu[0] || tu[1] || tu[2]) {
            const r = vscale(tu, this.angularSpeed * dt);

            if (r[0]) { hostEntity.rotateAroundLocal([1, 0, 0], r[0]); }
            if (r[2]) { hostEntity.rotateAroundLocal([0, 0, 1], r[2]); }

            if (r[1]) {
                if (this.worldUpYaw) {
                    hostEntity.rotateAroundWorld([0, 1, 0], r[1]);
                } else {
                    hostEntity.rotateAroundLocal([0, 1, 0], r[1]);
                }
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
}
