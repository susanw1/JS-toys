export class World {
    constructor() {
        this.entities = [];
        this.controllers = [];
        this.systems = [];
        this.actionMap = null;
        this.view = null;

        this.byCap = Object.create(null);   // capability -> Set<Asset>
    }

    add(entity) {
        this.entities.push(entity);
        entity.world = this;
        return entity;
    }

    remove(entity) {
        const i = this.entities.indexOf(entity);
        if (i >= 0) {
            this.entities.splice(i, 1);
        }
    }

    addController(ctrl) { this.controllers.push(ctrl); return ctrl; }
    addSystem(sys)      { this.systems.push(sys); return sys; }

    // ---------- Capability/action registration (recursive) ----------
    registerAssetTree(root) {
        const start = root.root || root; // allow Entity or Asset
        start.iterate((a) => { this.#registerOne(a); });
    }

    unregisterAssetTree(root) {
        const start = root.root || root;
        start.iterate((a) => { this.#unregisterOne(a); });
    }

    #registerOne(asset) {
        if (this.actionMap) {
            this.actionMap.registerAsset(asset);
        }
        const caps = asset.getCapabilities?.() || {};
        for (const k in caps) {
            if (!caps[k]) {
                continue;
            }
            if (!this.byCap[k]) {
                this.byCap[k] = new Set();
            }
            this.byCap[k].add(asset);
        }
    }

    #unregisterOne(asset) {
        if (this.actionMap) {
            this.actionMap.unregisterAsset(asset);
        }
        const caps = asset.getCapabilities?.() || {};
        for (const k in caps) {
            const set = this.byCap[k];
            if (set) {
                set.delete(asset);
            }
        }
    }

    // ---------- Simulation ----------
    update(dt) {
        for (const e of this.entities) {
            if (!e.alive) {
                continue;
            }
            if (typeof e.update === "function") {
                e.update(dt, this);
            }
            // Recursively update all fitted asset trees
            e.iterateAssets((a) => {
                if (typeof a.update === "function") {
                    a.update(dt, this);
                }
            });
        }
    }

    step(dt, input = null) {
        // share dt with recursive updater without changing signature
        dtShim = dt;

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

    // ---------- Capability / query helpers ----------
    getAssetsByCap(capability) {
        const set = this.byCap && this.byCap[capability];
        return set ? Array.from(set) : [];
    }

    getFirstAssetByCap(capability) {
        const set = this.byCap && this.byCap[capability];
        if (!set || set.size === 0) {
            return null;
        }
        // Return the first item from the set
        for (const a of set) {
            return a;
        }
        return null;
    }
}

// Private module-scoped shim so we don't rewrite signatures
let dtShim = 0;
