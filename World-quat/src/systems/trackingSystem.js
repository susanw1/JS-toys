import { vadd, vsub, vscale } from "../math/vec3.js";
import { shortestArcStep } from "../tracking/shortestArc.js";

export class TrackingSystem {
    constructor(entity, camera, input, tune, playerSession = null) {
        this.entity = entity;
        this.camera = camera;
        this.input = input;
        this.tune = tune;
        this.player = playerSession;
        this.prevCamPos = camera.position.slice();
        this.camVel = [0, 0, 0];
    }

    step(dt) {
        // camera velocity
        const delta = vsub(this.camera.position, this.prevCamPos);
        this.camVel = vscale(delta, 1 / (dt || 1e-6));
        this.prevCamPos = this.camera.position.slice();

        if (!this.input.toggles.trackEnabled) {
            return;
        }
        if (this.player && this.player.followView !== false) {
            return;
        }

        if (this.player.controlledEntity === this.host) {
            const activeId = this.player.view?.activeCameraId;
            if (activeId) {
                let belongsToHost = false;
                this.host.iterateAssets((a) => {
                    if (a.id === activeId) { belongsToHost = true; return false; }
                });
                if (belongsToHost) {
                    return; // self-view; do not aim at our own camera
                }
            }
        }

        const trackRate   = this.entity.params.trackTurnRate ?? 0.8;
        const rollRate    = this.entity.params.rollStabilize ?? 2.0;
        const leadSeconds = this.entity.params.leadTime ?? this.tune.leadTime ?? 0.20;

        const target = vadd(this.camera.position, vscale(this.camVel, leadSeconds));
        const toCam = vsub(target, this.entity.position);

        this.entity.rotation = shortestArcStep(
            this.entity.rotation,
            [0, 0, 1],              // entity local forward
            toCam,                  // desired world forward
            trackRate * dt,         // limited step
            [0, 1, 0],              // world up
            rollRate * dt           // roll correction per frame
        );
    }
}
