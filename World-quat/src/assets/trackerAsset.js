// src/assets/trackerAsset.js
import { Asset } from "./asset.js";
import { vsub, vqrot, clamp } from "../math/vec3.js";
import { qconj } from "../math/quat.js";

export class TrackerAsset extends Asset {
    constructor(opts = {}) {
        super({ kind: "tracker", ...opts });

        // radians/sec (per-axis clamp)
        this.turnRate = (opts.turnRate ?? 0.8);

        // world-space target point; null = idle
        this.targetPoint = null;

        // small deadband to avoid micro-chatter (radians)
        this.deadband = (opts.deadband ?? 0.0005);
    }

    setTargetPoint(p) {
        this.targetPoint = p ? [p[0], p[1], p[2]] : null;
    }

    clearTarget() {
        this.targetPoint = null;
    }

    update(dt) {
        if (!this.targetPoint || dt <= 0) {
            return;
        }

        const host = this.getHostEntity();
        if (!host) {
            return;
        }

        // Find a motor to request turns from
        const motors = host.findAssetsByKind ? host.findAssetsByKind("motor") : [];
        const motor = motors && motors[0];
        if (!motor) {
            return;
        }

        // Vector to target in world
        const targetInWorld = vsub(this.targetPoint, host.position);

        // Bring into host local space: vL = R^T * (target - pos)
        const qInv = qconj(host.rotation);
        const vL = vqrot(targetInWorld, qInv);

        // Yaw error (around +Y), pitch error (around +X)
        // Forward is +Z; yaw left/right; pitch up/down (right-handed)
        const yawErr   = Math.atan2(vL[0], vL[2]);
        const pitchErr = Math.atan2(-vL[1], Math.hypot(vL[0], vL[2]));

        // Deadband
        const y = (Math.abs(yawErr)   < this.deadband)   ? 0 : yawErr;
        const p = (Math.abs(pitchErr) < this.deadband) ? 0 : pitchErr;

        if (!y && !p) {
            return;
        }

        // Clamp per frame by rate
        const maxStep = this.turnRate * dt;
        const dyaw   = clamp(y, -maxStep, maxStep);
        const dpitch = clamp(p, -maxStep, maxStep);

        // Ask motor to turn by exact radians this frame
        motor.addTurnRadians(dpitch, dyaw, 0);
    }
}
