import { Asset } from "./asset.js";

export class RootAsset extends Asset {
    constructor(entity) {
        super({ kind: "root" });
        this.entity = entity;   // the owning entity
    }

    // Root is not "fitted"; it just mirrors the entity transform.
    onFitted() { /* no-op */ }
    onUnfitted() { /* no-op */ }

    // World reference comes from the entity.
    get world() {
        return this.entity.world;
    }

    // The root's world transform IS the entity transform.
    worldTransform() {
        return { pos: this.entity.position, rot: this.entity.rotation };
    }
}
