export class Player {
    constructor({ id, name, team = 0, isHuman = false } = {}) {
        this.id = id || `player_${Math.random().toString(36).slice(2)}`;
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
