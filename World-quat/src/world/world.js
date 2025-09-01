// Holds entities and steps them each frame. Now also owns controllers/systems.
export class World {
    constructor() {
        this.entities = [];
        this.controllers = [];
        this.systems = [];
        this.actionMap = null; // optional, set from app
    }

    add(entity) {
        this.entities.push(entity);
        entity.world = this;
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

    step(dt, input = null) {
        if (this.actionMap && input) {
            this.actionMap.process(input);
        }
        for (const c of this.controllers) {
            c.step?.(dt);
        }
        for (const s of this.systems) {
            s.step?.(dt);
        }
        this.update(dt);
    }
}
