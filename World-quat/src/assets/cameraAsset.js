import { Asset } from "./asset.js";
import { CAP } from "../core/caps.js";
import { quatNormalizePositive } from "../math/quat.js";

export class CameraAsset extends Asset {
    constructor(opts = {}) {
        super({ kind: "camera", ...opts });

        this.name = opts.name || "Camera";
        this.zoom = (opts.zoom ?? null);
        this.near = (opts.near ?? null);

        this.lagPos  = (opts.lagPos  ?? 0);    // seconds; 0 = no lag
        this.lagRot  = (opts.lagRot  ?? 0);    // seconds; 0 = no lag
        this.shakeAmp  = (opts.shakeAmp  ?? 0); // units in world space
        this.shakeFreq = (opts.shakeFreq ?? 7); // Hz

        // Private smoothed view state
        this.#viewPos = null; // [x,y,z]
        this.#viewRot = null; // [w,x,y,z]
        this.#shakeT = 0;
    }

    getCapabilities() {
        return { [CAP.cameraFeed]: true };
    }

    getActions() {
        return [];    // keep empty so only the global KeyC binding is used
    }

    // Called during integrate phase; makes view state up to date.
    update(dt, world) {
        // Base world pose from the rig
        const Tw = this.worldTransform();
        const [tx, ty, tz] = Tw.pos;
        const [rw, rx, ry, rz] = Tw.rot;

        if (this.#viewPos == null) {
            // Initialize on first run
            this.#viewPos = [tx, ty, tz];
            this.#viewRot = [rw, rx, ry, rz];
            this.#shakeT = 0;
        }

        // Positional smoothing
        if (this.lagPos > 0) {
            this.#viewPos[0] = smooth(this.#viewPos[0], tx, dt, this.lagPos);
            this.#viewPos[1] = smooth(this.#viewPos[1], ty, dt, this.lagPos);
            this.#viewPos[2] = smooth(this.#viewPos[2], tz, dt, this.lagPos);
        } else {
            this.#viewPos[0] = tx; this.#viewPos[1] = ty; this.#viewPos[2] = tz;
        }

        // Rotational smoothing (lerp in quat space is fine for small steps)
        if (this.lagRot > 0) {
            const a = 1 - Math.exp(-dt / this.lagRot);
            this.#viewRot[0] = this.#viewRot[0] + (rw - this.#viewRot[0]) * a;
            this.#viewRot[1] = this.#viewRot[1] + (rx - this.#viewRot[1]) * a;
            this.#viewRot[2] = this.#viewRot[2] + (ry - this.#viewRot[2]) * a;
            this.#viewRot[3] = this.#viewRot[3] + (rz - this.#viewRot[3]) * a;
            this.#viewRot = quatNormalizePositive(this.#viewRot);
        } else {
            this.#viewRot[0] = rw; this.#viewRot[1] = rx; this.#viewRot[2] = ry; this.#viewRot[3] = rz;
        }

        // Optional micro-shake
        if (this.shakeAmp > 0 && dt > 0) {
            this.#shakeT += dt;
            const s = this.shakeAmp;
            const w = this.shakeFreq * 2 * Math.PI;
            // Tiny offset in camera local right/up; could be improved later
            const dx = Math.sin(this.#shakeT * w) * s * 0.5;
            const dy = Math.cos(this.#shakeT * w * 0.8) * s * 0.5;
            this.#viewPos[0] += dx;
            this.#viewPos[1] += dy;
        }
    }

    // Read by PlayerCameraSystem (or anyone wanting the camera view)
    getViewTransform() {
        if (this.#viewPos && this.#viewRot) {
            return { pos: this.#viewPos.slice(), rot: this.#viewRot.slice() };
        }
        return this.worldTransform();
    }

    #viewPos;
    #viewRot;
    #shakeT;
}

// Exp smoothing helper: tau seconds to ~63% response
function smooth(current, target, dt, tau) {
    if (!tau || tau <= 0) {
        return target;
    }
    const a = 1 - Math.exp(-dt / tau);
    return current + (target - current) * a;
}
