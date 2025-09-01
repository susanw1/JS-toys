import {
    makeTransform,
    composeTransform
} from "../math/transform.js";


export class Asset {
    constructor(opts = {}) {
        this.id = opts.id || `asset_${Math.random().toString(36).slice(2)}`;
        this.local = makeTransform(opts.position || [0, 0, 0], opts.rotation || [1, 0, 0, 0]);
        this.mesh = opts.mesh || null; // optional MeshShape
        this.kind = opts.kind || "asset";
        this.host = null; // Entity when fitted
        this.mountId = null; // mount slot id
    }

    // Capabilities and actions (override in subclasses or instances)
    getCapabilities() {
        return {};
    }
    getActions() {
        return [];
    }

    // Lifecycle
    onFitted(host, mountId) {
        this.host = host;
        this.mountId = mountId;
    }
    onUnfitted() {
        this.host = null;
        this.mountId = null;
    }

    update(dt, world) {
        /* optional */ }

    // Compute world transform of this asset (host ∘ mount ∘ local)
    worldTransform() {
        if (!this.host || !this.mountId) return this.local;
        const mount = this.host.mounts[this.mountId];
        const Te = {
            pos: this.host.position,
            rot: this.host.rotation
        };
        return composeTransform(composeTransform(Te, mount.transform), this.local);
    }
}
