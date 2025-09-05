import { makeId } from "../core/id.js";

export class Player {
    constructor({ id, name, team = 0, isHuman = false } = {}) {
        this.id = id || makeId();
        this.name = name || "Player";
        this.team = team;
        this.isHuman = !!isHuman;

        // Simple scoring/stats (extend as needed)
        this.score = 0;
        this.stats = {
            kills: 0,
            deaths: 0,
            shotsFired: 0
        };

        // Convenience: what they currently possess (optional mirror of session)
        this.controlledEntity = null;
    }
}
