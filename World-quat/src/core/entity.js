import {
    quatIdentity,
    quatMultiply,
    quatNormalizePositive,
    quatFromAxisAngle,
    quatRotateVector
} from "../math/quat.js";
import { vadd } from "../math/vec3.js";
import { makeTransform } from "../math/transform.js";
import { RootAsset } from "../assets/rootAsset.js";

export class Entity {
    constructor(opts = {}) {
        this.position = opts.position ? opts.position.slice() : [0, 0, 0];
        this.rotation = opts.rotation ? opts.rotation.slice() : [1, 0, 0, 0]; // quat

        // Generic knobs & runtime state
        this.params = opts.params || {};
        this.state = opts.state || {};

        // Tag/type for filtering (e.g., "cube", "shell", "machine")
        this.kind = opts.kind || "entity";
        this.alive = true;

        // World backref (set by World.add)
        this.world = null;

        // permanent root asset that owns all mounts/actions/capabilities
        this.root = new RootAsset(this);
        // Optional shape for render/collision
        this.root.mesh = opts.shape || null;

        // Back-compat alias: expose mounts via getter so existing code still works.
        Object.defineProperty(this, "mounts", {
            get: () => this.root.mounts
        });
    }

    update(dt, world) {
        // Default: no-op. Subclasses can override.
    }

    // Visit all assets under this entity (starting at the root asset).
    // visitor(asset, { parent, mountId, depth })
    iterateAssets(visitor) {
        if (this.root) {
            this.root.iterate(visitor, null, null, 0);
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
        return quatRotateVector(this.rotation, v3);
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
        const dq = quatFromAxisAngle(axisLocal, angle);
        this.rotation = quatNormalizePositive(quatMultiply(this.rotation, dq));
    }

    // Rotate around a world axis by angle (pre-multiply).
    rotateAroundWorld(axisWorld, angle) {
        const dq = quatFromAxisAngle(axisWorld, angle);
        this.rotation = quatNormalizePositive(quatMultiply(dq, this.rotation));
    }

    // --- Mounts & Assets (now delegated to root) ------------------------
    addMount(cfg) {
        return this.root.addMount(cfg);
    }

    fitAsset(asset, mountId) {
        const fitted = this.root.fitAsset(asset, mountId);
        return fitted;
    }

    unfitAsset(mountId) {
        return this.root.unfitAsset(mountId);
    }
}
