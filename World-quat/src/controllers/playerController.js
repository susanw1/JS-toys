import { quatFromAxisAngle, quatMultiply, quatNormalizePositive, quatRotateVector } from "../math/quat.js";
import { vadd } from "../math/vec3.js";

// Drives the possessed entity via a MotorAsset using keyboard input.
// Movement is in the entity's LOCAL frame (forward +Z, right +X, up +Y).
//
// Keys:
//   Move:  W/S (±Z), A/D (±X), Q/E (±Y)
//   Turn:  P (pitch +), Y (yaw +), R (roll +)   — hold Shift to invert sign
//
// Notes:
//   - MotorAsset applies speeds and dt; we just send unit intents per frame.
//   - If no motor is fitted, this controller quietly does nothing (safe fallback).
export class PlayerController {
    constructor(entity, input, tune) {
        this.entity = entity;
        this.input = input;
        this.tune = tune;
    }

    step(dt) {
        const host = this.entity;
        if (!host) {
            return;
        }

        const motor = host.findFirstAssetByKind("motor");
        if (!motor) {
            return;
        }

        const held = this.input.held;

        // -------- Move (local space via Arrow keys) --------
        let mx = 0, my = 0, mz = 0;

        if (held.has("ArrowUp"))    { mz += 1; }  // forward  (+Z)
        if (held.has("ArrowDown"))  { mz -= 1; }  // backward (-Z)
        if (held.has("ArrowLeft"))  { mx -= 1; }  // left     (-X)
        if (held.has("ArrowRight")) { mx += 1; }  // right    (+X)

        if (held.has("PageUp"))     { my += 1; }  // up       (+Y)
        if (held.has("PageDown"))   { my -= 1; }  // down     (-Y)

        // Optional: sprint while Shift is held (affects move only)
        const sprint = (held.has("ShiftLeft") || held.has("ShiftRight")) ? 1.5 : 1.0;

        if (mx || my || mz) {
            motor.addMove(mx * sprint, my * sprint, mz * sprint);
        }

        // -------- Turn (local axes via P/Y/R) --------
        const inv = (held.has("ShiftLeft") || held.has("ShiftRight")) ? -1 : 1;

        let tp = 0, ty = 0, tr = 0;
        if (held.has("KeyP")) { tp += 1 * inv; }   // pitch about +X
        if (held.has("KeyY")) { ty += 1 * inv; }   // yaw   about +Y
        if (held.has("KeyR")) { tr += 1 * inv; }   // roll  about +Z

        if (tp || ty || tr) {
            motor.addTurn(tp, ty, tr);
        }
    }
}
