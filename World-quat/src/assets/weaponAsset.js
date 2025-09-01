import { Asset } from "./asset.js";

export class WeaponAsset extends Asset {
    constructor(opts = {}) {
        super({ kind: "weapon", ...opts });
        this.fireRate = (opts.fireRate ?? 4); // shots/sec
        this.magSize  = (opts.magSize  ?? 12);
        this.ammo     = (opts.ammo     ?? this.magSize);
        this.cooldown = 0;
        this.triggerHeld = false;
    }

    getCapabilities() {
        return { weapon: true };
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
}
