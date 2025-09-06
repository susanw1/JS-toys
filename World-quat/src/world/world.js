export class World {
    constructor() {
        this.entities = [];
        this.controllers = [];
        this.systems = [];
        this.systemsPost = [];
        this.actionMap = null;
        this.view = null;

        this.byCap = Object.create(null);   // capability -> Set<Asset>

        this.players = [];
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

    addController(ctrl) {
        this.controllers.push(ctrl);
        return ctrl;
    }

    addSystem(system, phase = "pre") {
        system.world = this;
        if (phase === "post") {
            this.systemsPost.push(system);
        } else {
            this.systems.push(system);
        }
        return system;
    }

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

    // ---------- Players ----------
    addPlayer(player) {
        this.players.push(player);
        return player;
    }

    removePlayer(player) {
        const i = this.players.indexOf(player);
        if (i >= 0) {
            this.players.splice(i, 1);
        }
    }

    getPlayers() {
        return this.players.slice();
    }

    findPlayerById(id) {
        for (const p of this.players) {
            if (p.id === id) {
                return p;
            }
        }
        return null;
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

        for (const s of this.systemsPost){
            s.step(dt);
        }
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
