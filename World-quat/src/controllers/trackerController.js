export class TrackerController {
    constructor(trackerAsset, renderCamera, inputMgr, playerSession) {
        this.tracker = trackerAsset;
        this.camera = renderCamera;
        this.input = inputMgr;
        this.player = playerSession;
    }

    step(dt) {
        // Track only when toggle is on, and only when NOT looking through the host’s own camera.
        const enabled = !!this.input?.toggles?.trackEnabled;

        if (!enabled) {
            this.tracker.clearTarget();
            return;
        }

        // Simple policy: when free-cam is active, track the render camera position;
        // otherwise (following a camera mounted on the same entity) do not track.
        const following = this.player ? (this.player.followView !== false) : true;
        if (following) {
            this.tracker.clearTarget();
            return;
        }

        const p = this.camera?.position;
        if (p && Number.isFinite(p[0] + p[1] + p[2])) {
            this.tracker.setTargetPoint(p);
        } else {
            this.tracker.clearTarget();
        }
    }
}
