import { Asset } from "./asset.js";
import { CAP } from "../core/caps.js";
import { EV } from "../core/events.js";

export class WeaponAsset extends Asset {
    constructor(opts = {}) {
        super({ kind: "weapon", ...opts });

        this.fireRate = (opts.fireRate ?? 5);
        this.magSize  = (opts.magSize  ?? 6);

        // Visual spin (optional)
        this.spinRate = (opts.spinRate ?? 0);
        this.spinAxis = (opts.spinAxis || [0, 0, 1]);

        // Trigger intent (controllers/bots set this)
        this.triggerHeld = false;

        // Private state
        this.#ammo     = this.magSize;
        this.#cooldown = 0;
    }

    getCapabilities() {
        return { [CAP.weapon]: true };
    }

    // Read-only accessors for other code (e.g., BotSession)
    get ammo() { return this.#ammo; }
    get cooldown() { return this.#cooldown; }

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
        if (this.#ammo < this.magSize) {
            this.#ammo = this.magSize; // instant for demo
            this.world.emit(EV.weapon_reloaded, { weapon: this });
            console.log(`[weapon ${this.id}] reloaded`);
        }
    }

    // give it a gentle spin every frame
    update(dt) {
        // Cooldown tick
        if (this.#cooldown > 0) {
            this.#cooldown = Math.max(0, this.#cooldown - dt);
        }

        // Optional spin visual
        if (this.spinRate) {
            this.rotateAroundLocal(this.spinAxis, this.spinRate * dt);
        }

        // Firing (encapsulated)
        if (this.triggerHeld && this.#cooldown <= 0) {
            if (this.#ammo > 0) {
                this.#ammo -= 1;
                this.#cooldown = 1 / this.fireRate;

                // Emit a fire event with origin/orientation
                const Tw = this.worldTransform();
                const owner = this.getHostEntity();
                this.world.emit(EV.weapon_fired, {
                    weapon: this,
                    ownerId: owner ? owner.ownerId : null,
                    transform: { pos: Tw.pos.slice(), rot: Tw.rot.slice() }
                });
            } else {
                // Dry-fire rate-limit (optional)
                this.#cooldown = 0.3;
                this.world.emit(EV.weapon_empty, { weapon: this });
            }
        }
    }

    // --- private ---
    #ammo;
    #cooldown;
}
