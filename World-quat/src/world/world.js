// Holds entities and steps them each frame. Now also owns controllers/systems.
export class World {
    constructor() {
        /** @type {Array<Entity>} */
        this.entities = [];
        this.controllers = [];
        this.systems = [];
    }

    add(entity) {
        this.entities.push(entity);
        return entity;
    }

    remove(entity) {
        const i = this.entities.indexOf(entity);
        if (i >= 0) this.entities.splice(i, 1);
    }

    addController(ctrl) {
        this.controllers.push(ctrl);
        return ctrl;
    }

    addSystem(sys) {
        this.systems.push(sys);
        return sys;
    }

    update(dt) {
        // Legacy hook: if callers still use world.update directly.
        for (const e of this.entities) {
            if (e.alive && typeof e.update === "function") {
                e.update(dt, this);
            }
        }
    }

    step(dt) {
        for (const c of this.controllers) {
            c.step?.(dt);
        }

        for (const s of this.systems) {
            s.step?.(dt);
        }
        this.update(dt); // let entities do local per-frame work
        // Optional: compact dead entities here.
    }
}
