import { EV } from "../core/events.js";

// Consumes weapon fire events and (for now) logs them or spawns projectiles.
// Register this as a POST system so it reads events emitted during updates.

export class WeaponEventsSystem {
    constructor() {}

    step(dt) {
        const world = this.world;
        const fires = world.drainEvents(EV.weapon_fired);

        for (const ev of fires) {
            // TODO: spawn a projectile entity here. For now, just log.
            // ev.transform = { pos: [x,y,z], rot: [w,x,y,z] }
            // ev.ownerId   = player id (if any)
            // ev.weapon    = the WeaponAsset
            // Example placeholder:
            console.log("FIRE", ev.transform.pos, world.findPlayerById(ev.ownerId), ev.weapon.id);
        }

        // consume weapon_empty for click sounds/UI
        world.drainEvents(EV.weapon_empty);
    }
}
