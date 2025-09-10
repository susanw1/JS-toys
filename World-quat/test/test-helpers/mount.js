import { Asset } from '../../src/assets/asset.js';
import { RootAsset } from '../../src/assets/rootAsset.js';
import { makeTransform } from '../../src/math/transform.js';

/** A tiny "world" with the hooks assets expect. */
export function makeWorldStub({ record = false } = {}) {
    const events = [];
    const world = {
        registerAssetTree() {},
        unregisterAssetTree() {},
        emit(ev, payload) { if (record) events.push({ ev, payload }); }
    };
    return { world, events };
}

/** Consistent Entity-like shape used across tests. */
export function makeEntity({ position=[0,0,0], rotation=[1,0,0,0], world } = {}) {
    return {
        position: position.slice(0, 3),
        rotation: rotation.slice(0, 4),
        world: world ?? makeWorldStub().world,
        mounts: {},
        findAssetsByKind(kind) { return this._assets?.filter(a => a.kind === kind) ?? []; },
        _assets: [],
    };
}

/** Mount an asset under an entity via RootAsset and fitAsset (real path). */
export function mountOnEntity(entity, asset, { id='m0', transform=makeTransform(), slot='any' } = {}) {
    const root = new RootAsset(entity);                 // mirrors entity pose
    root.addMount({ id, slot, transform });
    root.fitAsset(asset, id);                           // sets host+mountId, emits, etc.
    return { root, mountId: id };
}
