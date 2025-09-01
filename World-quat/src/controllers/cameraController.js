import { quatFromAxisAngle, quatMultiply, quatNormalizePositive, quatRotateVector } from "../math/quat.js";
import { vadd } from "../math/vec3.js";

const VIEW_VECTORS = {
    KeyW: [ 0,  0,  1],
    KeyS: [ 0,  0, -1],
    KeyA: [-1,  0,  0],
    KeyD: [ 1,  0,  0],
    KeyQ: [ 0, -1,  0],
    KeyE: [ 0,  1,  0],
};

function localMoveFromHeld(held, map, step) {
    let x = 0, y = 0, z = 0;
    for (const code of held) {
        const v = map[code];
        if (v) { x += v[0] * step; y += v[1] * step; z += v[2] * step; }
    }
    return [x, y, z];
}

export class CameraController {
    constructor(camera, input, tune) {
        this.camera = camera;
        this.input = input;
        this.tune = tune;
        this.fpsMode = true;
    }

    step(dt) {
        // update mode from toggles (F key)
        this.fpsMode = !!this.input.toggles.fpsMode;

        // pointer yaw/pitch
        const sens = (this.input.pointer.type === "mouse") ? this.tune.mouseSensitivity : this.tune.touchSensitivity;
        const yaw =  this.input.pointer.dx * sens;
        const pitch = -this.input.pointer.dy * sens;

        if (yaw || pitch) {
            const cam = this.camera;
            let q;
            if (this.fpsMode) {
                const qYawWorld = quatFromAxisAngle([0, 1, 0], yaw);
                q = quatMultiply(qYawWorld, cam.rotation);
                const right = quatRotateVector(q, [-1, 0, 0]);
                const qPitchRight = quatFromAxisAngle(right, pitch);
                q = quatMultiply(qPitchRight, q);
            } else {
                q = quatMultiply(cam.rotation, quatFromAxisAngle([0, 1, 0], yaw));
                q = quatMultiply(q, quatFromAxisAngle([-1, 0, 0], pitch));
            }
            cam.rotation = quatNormalizePositive(q);
        }

        // WASD/QE translation
        const step = this.tune.camMoveRate * dt;
        const vLocal = localMoveFromHeld(this.input.held, VIEW_VECTORS, step);
        if (vLocal[0] || vLocal[1] || vLocal[2]) {
            const world = quatRotateVector(this.camera.rotation, vLocal);
            this.camera.position = vadd(this.camera.position, world);
        }

        // Zoom (Z) with Shift to invert sign (same as before)
        if (this.input.held.has("KeyZ")) {
            const sign = this.input.shift ? -1 : 1;
            this.camera.zoom += sign * this.tune.zoomRate * dt;
            if (this.camera.zoom < 10) this.camera.zoom = 10;
        }
    }
}
