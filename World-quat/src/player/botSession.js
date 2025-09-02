export class BotSession {
    constructor(world, { camera = null, player = null } = {}) {
        this.world = world;
        this.camera = camera;
        this.controlledEntity = null;
        this.view = { activeCameraId: null };

        this.player = player || null;

        this.turnRate   = 0.6;
        this.burstOn    = 0.7;
        this.burstOff   = 0.9;
        this.cycleEvery = 4.0;

        this.#burstTimer = null;
        this.#burstPhaseOn = true;
        this.#weapon = null;
        this.#cycleTimer = 0;
    }

    setControlledEntity(entity) {
        this.controlledEntity = entity;
        if (this.player) {
            this.player.controlledEntity = entity;
        }
        this.#weapon = null;
        this.#selectDefaultCamera();
    }

    step(dt) {
        this.think(dt);
    }

    think(dt) {
        const host = this.controlledEntity;
        if (!host) { return; }

        host.rotateAroundWorld([0, 1, 0], this.turnRate * dt);

        const motor = host.findFirstAssetByKind("motor");
        // Apply a gentle yaw via motor (local +Y)
        if (motor && this.turnRate) {
            motor.addTurn(0, 1, 0); // 1 unit * angularSpeed * dt inside motor
        } else if (this.turnRate) {
            // Fallback if no motor fitted
            host.rotateAroundWorld([0, 1, 0], this.turnRate * dt);
        }


        if (!this.#weapon || this.#weapon.host !== host) {
            this.#weapon = host.findFirstAssetByKind("weapon");
        }

        if (this.#weapon) {
            if (this.#weapon.ammo <= 0 && this.#weapon.cooldown <= 0) {
                this.#weapon.reload();
            }
            this.#updateBurst(dt, this.#weapon);
        }

        this.#cycleTimer += dt;
        if (this.#cycleTimer >= this.cycleEvery) {
            this.#cycleTimer = 0;
            this.#cycleCamera();
        }
    }

    #updateBurst(dt, weapon) {
        if (this.#burstTimer == null) {
            this.#burstTimer = this.burstOn;
            this.#burstPhaseOn = true;
        }

        this.#burstTimer -= dt;
        if (this.#burstTimer <= 0) {
            this.#burstPhaseOn = !this.#burstPhaseOn;
            this.#burstTimer = this.#burstPhaseOn ? this.burstOn : this.burstOff;
        }

        weapon.triggerHeld = this.#burstPhaseOn;
    }

    #selectDefaultCamera() {
        const first = this.controlledEntity ? this.controlledEntity.findFirstAssetByKind("camera") : null;
        if (first) {
            this.view.activeCameraId = first.id;
        }
    }

    #cycleCamera() {
        if (!this.controlledEntity) { return; }
        const cams = this.controlledEntity.findAssetsByKind("camera");
        if (!cams.length) { return; }
        const cur = this.view.activeCameraId;
        let idx = cams.findIndex(a => a.id === cur);
        idx = (idx < 0) ? 0 : (idx + 1) % cams.length;
        this.view.activeCameraId = cams[idx].id;
    }

    #burstTimer;
    #burstPhaseOn;
    #weapon;
    #cycleTimer;
}
