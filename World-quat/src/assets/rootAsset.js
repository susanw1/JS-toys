import { Asset } from "./asset.js";

export class RootAsset extends Asset {
    constructor(entity, opts = {}) {
        super({ kind: "root", ...opts});
        this.entity = entity;   // the owning entity
    }

    // Root is not "fitted"; it just mirrors the entity transform.
    onFitted() { /* no-op */ }
    onUnfitted() { /* no-op */ }

    // The root's world transform IS the entity transform.
    worldTransform() {
        return { pos: this.entity.position, rot: this.entity.rotation };
    }
}
