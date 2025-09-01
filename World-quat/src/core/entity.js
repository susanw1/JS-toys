import {
    quatMultiply,
    quatNormalizePositive,
    quatFromAxisAngle,
    quatRotateVector
} from "../math/quat.js";
import { vadd } from "../math/vec3.js";
import { makeTransform } from "../math/transform.js";

export class Entity {
    constructor(opts = {}) {
        this.position = opts.position ? opts.position.slice() : [0, 0, 0];
        this.rotation = opts.rotation ? opts.rotation.slice() : [1, 0, 0, 0];

        // Generic knobs & runtime state
        this.params = opts.params || {};
        this.state = opts.state || {};

        // Optional shape for render/collision
        this.shape = opts.shape || null;

        // Tag/type for filtering
        this.kind = opts.kind || "entity";
        this.alive = true;

        // mounting + inventory
        this.mounts = {}; // id -> { id, category, transform, accepts?, asset: Asset|null }
        this.inventory = []; // loose assets

        // world reference (set by World.add)
        this.world = null;
    }

    update(dt, world) {
        /* subclasses may override */
    }

    // --- Pure helpers ----------------------------------------------------
    rotateVectorLocal(v3) {
        return quatRotateVector(this.rotation, v3);
    }
    get forward() {
        return this.rotateVectorLocal([0, 0, 1]);
    }
    get right() {
        return this.rotateVectorLocal([1, 0, 0]);
    }
    get up() {
        return this.rotateVectorLocal([0, 1, 0]);
    }

    // Transform a local point to world
    modelToWorld(vLocal) {
        const r = this.rotateVectorLocal(vLocal);
        return [r[0] + this.position[0], r[1] + this.position[1], r[2] + this.position[2]];
    }

    // --- Mutating helpers ------------------------------------------------
    translateLocal(vLocal) {
        const w = this.rotateVectorLocal(vLocal);
        this.position = vadd(this.position, w);
    }

    rotateAroundLocal(axisLocal, angle) {
        const dq = quatFromAxisAngle(axisLocal, angle);
        this.rotation = quatNormalizePositive(quatMultiply(this.rotation, dq));
    }

    rotateAroundWorld(axisWorld, angle) {
        const dq = quatFromAxisAngle(axisWorld, angle);
        this.rotation = quatNormalizePositive(quatMultiply(dq, this.rotation));
    }

    // --- Mounts & Assets -------------------------------------------
    addMount({
        id,
        category = "",
        transform = makeTransform(),
        accepts = null
    }) {
        this.mounts[id] = {
            id,
            category,
            transform,
            accepts,
            asset: null
        };
        return this.mounts[id];
    }

    fitAsset(asset, mountId) {
        const m = this.mounts[mountId];
        if (!m) throw new Error(`Unknown mount '${mountId}'`);
        if (m.asset) throw new Error(`Mount '${mountId}' already occupied`);
        // Basic accept check (function or string compare)
        if (typeof m.accepts === "string") {
            if ((asset.kind || "") !== m.accepts) throw new Error(`Asset kind '${asset.kind}' not accepted by mount '${mountId}'`);
        } else if (typeof m.accepts === "function" && !m.accepts(asset)) {
            throw new Error(`Asset not accepted by mount '${mountId}'`);
        }
        m.asset = asset;
        asset.onFitted(this, mountId);
        this.world?.actionMap?.registerAsset(asset);
        return asset;
    }

    unfitAsset(mountId) {
        const m = this.mounts[mountId];
        if (!m || !m.asset) return null;
        const a = m.asset;
        m.asset = null;
        a.onUnfitted();
        this.world?.actionMap?.unregisterAsset(a);
        return a;
    }
}
