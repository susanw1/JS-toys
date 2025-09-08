// Canonical event names (avoid string typos).
export const EV = {
    weapon_fired:      "weapon_fired",
    weapon_empty:      "weapon_empty",
    weapon_reloaded:   "weapon_reloaded",

    asset_fitted:      "asset_fitted",
    asset_unfitted:    "asset_unfitted",

    camera_changed:    "camera_changed",

    // Future (projectiles / combat):
    projectile_spawned: "projectile_spawned",
    projectile_hit:     "projectile_hit",
    entity_damaged:     "entity_damaged",
    entity_destroyed:   "entity_destroyed",
    score_awarded:      "score_awarded"
};

// Minimal per-frame event queue.
export class EventQueue {
    constructor() {
        this.list = [];
    }

    // Emit a new event. Supply a type and payload; t/frame/source are optional.
    emit(type, payload = {}, { source = null, frame = null, t = null } = {}) {
        const ev = { type, ...payload };
        ev.t = (t != null) ? t : performance.now();
        if (frame != null) { ev.frame = frame; }
        if (source != null) { ev.source = source; }
        this.list.push(ev);
        return ev;
    }

    // Drain all events of a specific type; if type is falsy, drain everything.
    drain(type) {
        if (!type) {
            const all = this.list;
            this.list = [];
            return all;
        }
        const out = [];
        const keep = [];
        for (const e of this.list) {
            if (e.type === type) {
                out.push(e);
            } else {
                keep.push(e);
            }
        }
        this.list = keep;
        return out;
    }

    // Non-destructive peek (optional helper)
    peek(type) {
        if (!type) { return this.list.slice(); }
        const out = [];
        for (const e of this.list) {
            if (e.type === type) { out.push(e); }
        }
        return out;
    }

    clear() {
        this.list.length = 0;
    }

    count(type) {
        if (!type) {
         return this.list.length;
        }
        let n = 0;
        for (const e of this.list) {
            if (e.type === type) { n++; }
        }
        return n;
    }
}
