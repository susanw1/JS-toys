import { Asset } from "./asset.js";
import { CAP } from "../core/caps.js";

export class CameraAsset extends Asset {
    #chaseRot;
    #chaseInit;

    constructor(opts = {}) {
        super({ kind: "camera", ...opts });

        this.name = opts.name || "Camera";
        this.zoom = (opts.zoom ?? null);
        this.near = (opts.near ?? null);

        // Tuning knobs (1/s time constants; 0 = snap)
        this.lagRot = (opts.lagRot ?? 0);
        this.lagMode = opts.lagMode || undefined;  // "chase" to enable chase smoothing; otherwise undefined

        // Chase-only minimal state
        this.#chaseRot = [1, 0, 0, 0];
        this.#chaseInit = false;
    }

    getCapabilities() {
        return { [CAP.cameraFeed]: true };
    }

    getActions() {
        return [];    // keep empty so only the global KeyC binding is used
    }

    /**
     * Integrate step: compute smoothed view pose.
     * - Mounted: smooth in parent-local; recompose → world.
     * - Unmounted: smooth directly in world.
     * @param {number} dt
     */
    update(dt) {
        if (this.lagMode !== "chase" || this.host) {
            this.#chaseInit = false;
            return;
        }
        const tw = this.worldTransform(); // { pos, rot }
        const qTarget = tw.rot;

        if (!this.#chaseInit) {
            // Seed to avoid a pop when enabling chase
            this.#chaseRot = [qTarget[0], qTarget[1], qTarget[2], qTarget[3]];
            this.#chaseInit = true;
            return;
        }

        // Exponential blend: α = 1 - exp(-k*dt)
        const k = this.lagRot > 0 ? this.lagRot : 0;
        const alpha = k > 0 ? (1 - Math.exp(-k * dt)) : 1;

        const qCur = this.#chaseRot;
        const qInvCur = qinv(qCur.slice());              // current^-1
        const qDelta = qmul(qInvCur, qTarget.slice());   // how far to go this frame
        const qStep  = qnlerp([1,0,0,0], qDelta, alpha); // small step toward delta
        this.#chaseRot = qmul(qCur.slice(), qStep);      // apply step on the left
        // normalize + clamp to positive hemisphere (qnlerp does this; do one more pass)
        this.#chaseRot = qnlerp(this.#chaseRot, this.#chaseRot, 1, this.#chaseRot);
    }

    /**
     * Read the final (smoothed) pose for this camera asset.
     * @returns {{pos:number[], rot:number[]}}
     */
    getViewTransform() {
        const tw = this.worldTransform(); // { pos, rot }
        if (this.lagMode !== "chase" || this.host) {
            // Not a chase cam, or it's mounted: no smoothing, no surprises.
            this.#chaseInit = false; // reset so next time chase starts cleanly
            return tw;
        }
        // Unmounted + chase mode: return smoothed rotation, raw position.
        return { pos: tw.pos, rot: this.#chaseRot };
    }
}
