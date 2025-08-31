// Holds entities and steps them each frame.
export class World {
    constructor() {
        /** @type {Array<Entity>} */
        this.entities = [];
    }

    add(entity) {
        this.entities.push(entity);
        return entity;
    }

    remove(entity) {
        const i = this.entities.indexOf(entity);
        if (i >= 0) {
            this.entities.splice(i, 1);
        }
    }

    update(dt) {
        // You can split into systems later; for now let entities update themselves.
        for (const e of this.entities) {
            if (e.alive && typeof e.update === "function") {
                e.update(dt, this);
            }
        }
        // Optional: compact dead entities here.
    }
}
