import {
    qid,
    qmul,
    qnormpos,
    qaxis,
    qrot
} from "../math/quat.js";
import { vadd } from "../math/vec3.js";
import { makeTransform } from "../math/transform.js";
import { RootAsset } from "../assets/rootAsset.js";

export class Entity {
    #root;

    constructor(opts = {}) {
        // permanent root asset that owns all mounts/actions/capabilities
        this.#root = new RootAsset(this, opts);

        // Generic knobs & runtime state
        this.params = opts.params || {};
        this.state = opts.state || {};

        // Tag/type for filtering (e.g., "cube", "shell", "machine")
        this.kind = opts.kind || "entity";
        this.alive = true;

        this.ownerId = (opts.ownerId ?? null);

        // Optional shape for render/collision
        this.#root.mesh = opts.shape || null;
    }

    set position(pos) {
        this.#root.local.pos = pos;
    }
    get position() {
        return this.#root.local.pos;
    }
    set rotation(rot) {
        this.#root.local.rot = rot;
    }
    get rotation() {
        return this.#root.local.rot;
    }
    get mounts() {
        return this.#root.local.mounts;
    }
    get world() {
        return this.#root.world;
    }
    get root() {
        return this.#root;
    }

    update(dt) {
        // Default: no-op. Subclasses can override.
    }

    // Visit all assets under this entity (starting at the root asset).
    // visitor(asset, { parent, mountId, depth })
    iterateAssets(visitor) {
        if (this.#root) {
            this.#root.iterate(visitor, null, null, 0);
        }
    }

    // Find the first asset matching a predicate.
    // predicate(asset, { parent, mountId, depth }) → truthy to select
    findAsset(predicate) {
        let hit = null;
        this.iterateAssets((a, info) => {
            if (predicate(a, info)) {
                hit = a;
                return false; // prune
            }
        });
        return hit;
    }

    // Convenience: first asset by kind string (e.g., "weapon", "camera").
    findFirstAssetByKind(kind) {
        return this.findAsset((a) => a.kind === kind);
    }

    // Convenience: gather all assets by kind.
    findAssetsByKind(kind) {
        const out = [];
        this.iterateAssets((a) => {
            if (a.kind === kind) {
                out.push(a);
            }
        });
        return out;
    }

    // --- Pure helpers ----------------------------------------------------

    // Rotate a local-space vector by this entity’s rotation (does not mutate).
    rotateVectorLocal(v3) {
        return qrot(this.rotation, v3);
    }

    // Convenience directions in world space.
    get forward() {
        return this.rotateVectorLocal([0, 0, 1]);
    }

    get right() {
        return this.rotateVectorLocal([1, 0, 0]);
    }

    get up() {
        return this.rotateVectorLocal([0, 1, 0]);
    }

    // Transform a local point to world space (rotation + translation).
    modelToWorld(vLocal) {
        const r = this.rotateVectorLocal(vLocal);
        return [ r[0] + this.position[0], r[1] + this.position[1], r[2] + this.position[2] ];
    }

    // --- Mutating helpers ------------------------------------------------

    // Translate in local space (e.g., [dx,dy,dz] in the entity’s frame).
    translateLocal(vLocal) {
        const w = this.rotateVectorLocal(vLocal);
        this.position = vadd(this.position, w);
    }

    // Rotate around a local axis by angle (right-multiply).
    rotateAroundLocal(axisLocal, angle) {
        const dq = qaxis(axisLocal, angle);
        this.rotation = qnormpos(qmul(this.rotation, dq));
    }

    // Rotate around a world axis by angle (pre-multiply).
    rotateAroundWorld(axisWorld, angle) {
        const dq = qaxis(axisWorld, angle);
        this.rotation = qnormpos(qmul(dq, this.rotation));
    }

    // --- Mounts & Assets (now delegated to root) ------------------------
    addMount(cfg) {
        return this.#root.addMount(cfg);
    }

    setOwner(playerOrId) {
        this.ownerId = (typeof playerOrId === "string") ? playerOrId : (playerOrId ? playerOrId.id : null);
    }

    fitAsset(asset, mountId) {
        const fitted = this.#root.fitAsset(asset, mountId);
        return fitted;
    }

    unfitAsset(mountId) {
        return this.#root.unfitAsset(mountId);
    }
}
