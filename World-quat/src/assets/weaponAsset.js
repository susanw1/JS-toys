import { Asset } from "./asset.js";
import { quatFromAxisAngle, quatMultiply, quatNormalizePositive } from "../math/quat.js";
import { CAP } from "../core/caps.js";

export class WeaponAsset extends Asset {
    constructor(opts = {}) {
        super({ kind: "weapon", ...opts });
        this.fireRate = (opts.fireRate ?? 4);    // shots/sec
        this.magSize  = (opts.magSize  ?? 12);
        this.ammo     = (opts.ammo     ?? this.magSize);
        this.cooldown = 0;
        this.triggerHeld = false;

        // NEW: simple idle spin (rad/s) and axis in local space
        this.spinRate = (opts.spinRate ?? 1.2);
        this.spinAxis = (opts.spinAxis || [0, 0, 1]);   // roll around forward by default
    }

    getCapabilities() {
        return { [CAP.weapon]: true };
    }

    getActions() {
        return [
            {
                id: `${this.id}_fire`,
                label: "Fire",
                type: "hold",
                suggestedKeys: ["Space"],
                invoke: ({ phase }) => { this.triggerHeld = (phase !== "release"); }
            },
            {
                id: `${this.id}_reload`,
                label: "Reload",
                type: "press",
                suggestedKeys: ["KeyL"],
                invoke: () => { this.reload(); }
            }
        ];
    }

    reload() {
        if (this.ammo < this.magSize) {
            this.ammo = this.magSize; // instant for demo
            console.log(`[weapon ${this.id}] reloaded`);
        }
    }

    // give it a gentle spin every frame
    update(dt, world) {
        if (this.cooldown > 0) {
            this.cooldown = Math.max(0, this.cooldown - dt);
        }

        if (this.spinRate) {
            this.rotateAroundLocal(this.spinAxis, this.spinRate * dt);
        }

        // firing handled by WeaponsSystem
    }
}
