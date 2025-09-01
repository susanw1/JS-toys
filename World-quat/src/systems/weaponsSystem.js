export class WeaponsSystem {
    constructor(hostEntity) {
        this.host = hostEntity;
    }

    step(dt) {
        for (const id in (this.host.mounts || {})) {
            const a = this.host.mounts[id].asset;
            if (!a || a.kind !== "weapon") {
                continue;
            }
            a.cooldown = Math.max(0, a.cooldown - dt);

            if (a.triggerHeld && a.cooldown <= 0) {
                if (a.ammo > 0) {
                    a.ammo -= 1;
                    a.cooldown = 1 / a.fireRate;
                    // Stub: spawn projectile / play audio
                    console.log(`[weapon ${a.id}] bang! ammo=${a.ammo}`);
                } else {
                    a.cooldown = 0.3;
                    console.log(`[weapon ${a.id}] click (empty)`);
                }
            }
        }
    }
}
