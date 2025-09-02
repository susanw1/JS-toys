// Key → action dispatcher with edge detection.
// Action: { id, label, type: "press"|"hold"|"release"|"toggle", suggestedKeys: string[], enabled?(), invoke({key,input,phase,toggled}) }
export class ActionMap {
    constructor() {
        this.bindings = new Map();   // key -> Set(actionId)
        this.actions = new Map();    // actionId -> { asset, action }
        this.lastHeld = new Set();   // keys that were held last frame
        this.toggleState = new Map();// actionId -> boolean
    }

    registerGlobal(action) {
        this.actions.set(action.id, { asset: null, action });
        for (const key of (action.suggestedKeys || [])) {
            this.bind(key, action.id);
        }
    }

    registerAsset(asset) {
        const list = asset.getActions?.() || [];
        for (const action of list) {
            this.actions.set(action.id, { asset, action });
            for (const key of (action.suggestedKeys || [])) {
                this.bind(key, action.id);
            }
        }
    }

    unregisterAsset(asset) {
        for (const [id, holder] of [...this.actions]) {
            if (holder.asset === asset) {
                this.actions.delete(id);
                this.unbindAllFor(id);
                this.toggleState.delete(id);
            }
        }
    }

    bind(key, actionId) {
        if (!this.bindings.has(key)) {
            this.bindings.set(key, new Set());
        }
        this.bindings.get(key).add(actionId);
    }

    unbindAllFor(actionId) {
        for (const set of this.bindings.values()) {
            set.delete(actionId);
        }
    }

    process(input) {
        const heldNow = input.held;
        const last = this.lastHeld;

        const pressed = [];
        const released = [];

        for (const k of heldNow) {
            if (!last.has(k)) {
                pressed.push(k);
            }
        }
        for (const k of last) {
            if (!heldNow.has(k)) {
                released.push(k);
            }
        }

        for (const key of pressed)  { this.#dispatch(key, "press", input); }
        for (const key of heldNow)  { this.#dispatch(key, "hold", input); }
        for (const key of released) { this.#dispatch(key, "release", input); }

        this.lastHeld = new Set(heldNow);
    }

    #dispatch(key, phase, input) {
        const ids = this.bindings.get(key);
        if (!ids) {
            return;
        }
        for (const id of ids) {
            const h = this.actions.get(id);
            if (!h) {
                continue;
            }
            const { action } = h;
            if (action.enabled && !action.enabled()) {
                continue;
            }
            if (action.type === "press"   && phase !== "press")   { continue; }
            if (action.type === "hold"    && !(phase === "hold" || phase === "release")) { continue; }
            if (action.type === "release" && phase !== "release") { continue; }

            let toggled;
            if (action.type === "toggle") {
                if (phase !== "press") {
                    continue;
                }
                const cur = !!this.toggleState.get(id);
                toggled = !cur;
                this.toggleState.set(id, toggled);
            }
            action.invoke?.({ key, input, phase, toggled });
        }
    }
}
