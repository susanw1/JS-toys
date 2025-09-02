import { makeTransform, composeTransform } from "../math/transform.js";

export class Asset {
    constructor(opts = {}) {
        this.id = opts.id || `asset_${Math.random().toString(36).slice(2)}`;
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

    // ---------- Lifecycle ----------
    onFitted(host, mountId) { this.host = host; this.mountId = mountId; }
    onUnfitted() { this.host = null; this.mountId = null; }

    update(dt, world) {
        // optional per-frame logic
    }

    // ---------- World reference ----------
    get world() {
        // Climb to the root entity to read its world
        let h = this.host;
        while (h && h.host) {
            h = h.host;
        }
        return h ? h.world : null;
    }

    // ---------- Mounts on assets ----------
    addMount({ id, category = "", transform = makeTransform(), accepts = null }) {
        this.mounts[id] = { id, category, transform, accepts, asset: null };
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

        // Accepts check (string or function)
        if (typeof m.accepts === "string") {
            if ((asset.kind || "") !== m.accepts) {
                throw new Error(`Asset kind '${asset.kind}' not accepted by mount '${mountId}'`);
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
        this.world?.registerAssetTree?.(asset);
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
