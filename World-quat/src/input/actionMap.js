// Simple key→action dispatcher. Actions are { id, label, type, suggestedKeys, enabled?, invoke({key,input}) }
export class ActionMap {
    constructor() {
        this.bindings = new Map(); // key -> Set(actionId)
        this.actions = new Map(); // actionId -> { asset, action }
    }

    registerAsset(asset) {
        for (const action of asset.getActions?.() || []) {
            this.actions.set(action.id, {
                asset,
                action
            });
            for (const key of action.suggestedKeys || []) {
                this.bind(key, action.id);
            }
        }
    }

    unregisterAsset(asset) {
        for (const [id, h] of [...this.actions]) {
            if (h.asset === asset) {
                this.actions.delete(id);
                this.unbindAllFor(id);
            }
        }
    }

    bind(key, actionId) {
        if (!this.bindings.has(key)) this.bindings.set(key, new Set());
        this.bindings.get(key).add(actionId);
    }

    unbindAllFor(actionId) {
        for (const set of this.bindings.values()) set.delete(actionId);
    }

    // Very simple semantics: while key held, invoke hold/press actions each frame.
    // (You can extend with edge-detected press/release later.)
    process(input) {
        for (const key of input.held) {
            const ids = this.bindings.get(key);
            if (!ids) continue;
            for (const id of ids) {
                const h = this.actions.get(id);
                if (!h) continue;
                const { action } = h;
                if (action.enabled && !action.enabled()) continue;
                action.invoke?.({
                    key,
                    input
                });
            }
        }
    }
}
