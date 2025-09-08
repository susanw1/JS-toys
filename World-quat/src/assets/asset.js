import { quatFromAxisAngle, quatMultiply, quatNormalizePositive, quatRotateVector } from "../math/quat.js";
import { makeTransform, composeTransform } from "../math/transform.js";
import { makeId } from "../core/id.js";
import { EV } from "../core/events.js";

export class Asset {
    #world = null;

    constructor(opts = {}) {
        this.id = opts.id || makeId();
        this.local = makeTransform(opts.position || [0, 0, 0], opts.rotation || [1, 0, 0, 0]);
        this.mesh = opts.mesh || null;
        this.kind = opts.kind || "asset";

        // Host + mounting
        this.host = null;               // Entity or Asset
        this.mountId = null;            // id string of the mount on host
        this.mounts = {};               // id -> { id, category, transform, accepts?, asset: Asset|null }
    }

    // ---------- Capabilities / actions ----------
    getCapabilities() { return {}; }
    getActions() { return []; }

    // Helper to test capabilities safely.
    hasCapability(key) {
        const caps = this.getCapabilities();
        return !!caps[key];
    }

    // ---------- Lifecycle ----------
    onFitted(host, mountId) { this.host = host; this.mountId = mountId; }
    onUnfitted() { this.host = null; this.mountId = null; }

    update(dt) {
        // optional per-frame logic
    }

    // ---------- World / ownership ----------
    // Direct world pointer (managed by World during (un)registration)
    get world() {
        return this.#world;
    }

    // World calls these when registering/unregistering the subtree.
    attachWorld(world) {
        this.#world = world;
    }

    detachWorld() {
        this.#world = null;
    }

    // Return the owning Entity (climb through asset hosts to the root).
    getHostEntity() {
        let h = this.host;

        // Climb up through assets until the topmost host.
        while (h && h.host) {
            h = h.host;
        }

        // If top is an Entity (has position), return it.
        if (h && Array.isArray(h.position)) {
            return h;
        }

        // If top is a RootAsset, it exposes .entity → the owning Entity.
        if (h && h.entity && Array.isArray(h.entity.position)) {
            return h.entity;
        }

        return null;
    }

    // ---------- Mounts on assets ----------
    addMount(cfg = {}) {
        const id = cfg.id;
        const slot = cfg.slot;
        const transform = cfg.transform || makeTransform();
        const accepts = cfg.accepts || null;

        this.mounts[id] = { id, slot, transform, accepts, asset: null };
        return this.mounts[id];
    }

    fitAsset(asset, mountId) {
        const m = this.mounts[mountId];
        if (!m) {
            throw new Error(`Unknown mount '${mountId}'`);
        }
        if (m.asset) {
            throw new Error(`Mount '${mountId}' already occupied`);
        }

        // Compatibility check
        if (typeof m.accepts === "string") {
            const rule = m.accepts;
            if (rule.startsWith("cap:")) {
                const cap = rule.slice(4);
                if (!asset.hasCapability(cap)) {
                    throw new Error(`Asset missing capability '${cap}' for mount '${mountId}'`);
                }
            } else {
                if ((asset.kind || "") !== rule) {
                    throw new Error(`Asset kind '${asset.kind}' not accepted by mount '${mountId}'`);
                }
            }
        } else if (typeof m.accepts === "function") {
            if (!m.accepts(asset)) {
                throw new Error(`Asset not accepted by mount '${mountId}'`);
            }
        }

        // Cycle guard: prevent attaching an ancestor under its own descendant
        if (wouldCreateCycle(asset, this)) {
            throw new Error("Cannot fit: cycle detected (host is a descendant of asset)");
        }

        m.asset = asset;
        asset.onFitted(this, mountId);

        // Recursively register actions/capabilities
        this.world?.registerAssetTree(asset);
        this.world?.emit(EV.asset_fitted, { host: this, mountId, asset });
        return asset;
    }

    unfitAsset(mountId) {
        const m = this.mounts[mountId];
        if (!m || !m.asset) {
            return null;
        }
        const a = m.asset;
        m.asset = null;
        a.onUnfitted();
        this.world?.unregisterAssetTree?.(a);
        this.world?.emit(EV.asset_unfitted, { host: this, mountId, asset: a });
        return a;
    }

    // ---------- Transform composition ----------
    worldTransform() {
        // host ∘ mount ∘ local
        if (!this.host || !this.mountId) {
            return this.local;
        }
        const mount = this.host.mounts[this.mountId];
        const Te = (this.host.position && this.host.rotation)
            ? { pos: this.host.position, rot: this.host.rotation }
            : this.host.worldTransform(); // parent asset already composes itself
        return composeTransform(composeTransform(Te, mount.transform), this.local);
    }

    // Depth-first traversal starting at this asset.
    // visitor(asset, { parent, mountId, depth }) may return:
    //   false -> do not descend into this asset's children (prune)
    iterate(visitor, parent = null, mountId = null, depth = 0) {
        const info = { parent, mountId, depth };
        const res = visitor(this, info);
        if (res === false) {
            return;
        }
        const mounts = this.mounts || {};
        for (const id in mounts) {
            const child = mounts[id].asset;
            if (child) {
                child.iterate(visitor, this, id, depth + 1);
            }
        }
    }

    // Convenience directions in LOCAL space (from local.rot)
    get forward() {
        return this.rotateVectorLocal([0, 0, 1]);
    }

    get right() {
        return this.rotateVectorLocal([1, 0, 0]);
    }

    get up() {
        return this.rotateVectorLocal([0, 1, 0]);
    }

    translateLocal(v3) {
        const w = quatRotateVector(this.local.rot, v3);
        this.local.pos = [ this.local.pos[0] + w[0],
                           this.local.pos[1] + w[1],
                           this.local.pos[2] + w[2] ];
    }

    rotateAroundLocal(axisLocal, angle) {
        const dq = quatFromAxisAngle(axisLocal, angle);
        this.local.rot = quatNormalizePositive(quatMultiply(this.local.rot, dq));
    }
}

function wouldCreateCycle(asset, newHost) {
    // True if newHost is a descendant of asset
    let n = newHost;
    while (n && n.host) {
        if (n === asset) {
            return true;
        }
        n = n.host;
    }
    return false;
}
