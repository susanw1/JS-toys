// src/app.js
import { Entity } from "./core/entity.js";
import { Camera } from "./core/camera.js";
import { Viewer } from "./render/viewer.js";

import { quatFromAxisAngle, quatMultiply, quatNormalize, quatRotateVector } from "./math/quat.js";
import { vadd, vsub, vscale } from "./math/vec3.js";
import { shortestArcStep } from "./tracking/shortestArc.js";

// ---------- Tunables ----------
export const TUNE = {
    cubeTurnRate: 1.5,            // rad/s for R, P, Y
    cubeMoveRate: 1.0,            // units/s for arrows + PgUp/Dn
    camMoveRate: 1.0,             // units/s for WASD + QE
    zoomRate: 250,                // pixels/s for Z
    maxTrackingTurnRate: 0.8,     // rad/s toward target (overall)
    rollStabilize: 2.0,           // rad/s roll back toward world-up (0 = off)
    leadTime: 0.20,               // s: predictive lead on camera
    mouseSensitivity: 0.0025,     // rad / px (mouse)
    touchSensitivity: 0.004       // rad / px (touch)
};

// ---------- Mesh (same as before) ----------
export const CUBE_MESH = {
    vertices: [
        [-1, -0.75, -1.5], [-1, -0.75,  1.5], [-1,  0.75,  1.5], [-1,  0.75, -1.5],
        [ 1, -0.75, -1.5], [ 1, -0.75,  1.5], [ 1,  0.75,  1.5], [ 1,  0.75, -1.5]
    ],
    edges: [
        [0, 1, 2, 3, 0, 4, 5, 6, 7, 4],
        [1, 5],
        [6, 2],
        [3, 7]
    ]
};

// ---------- Input state ----------
const NAV_KEYS = new Set([
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "PageUp", "PageDown", "Home", "End", "Space"
]);

const LOCAL_MOVE_VECTORS = {
    ArrowUp:    (s) => [[0], [0], [ s]],
    ArrowDown:  (s) => [[0], [0], [-s]],
    ArrowLeft:  (s) => [[-s], [0], [0]],
    ArrowRight: (s) => [[ s], [0], [0]],
    PageUp:     (s) => [[0], [-s], [0]],
    PageDown:   (s) => [[0], [ s], [0]]
};

const VIEW_VECTORS = {
    KeyW:  (s) => [[0], [0], [ s]],
    KeyS:  (s) => [[0], [0], [-s]],
    KeyA:  (s) => [[-s], [0], [0]],
    KeyD:  (s) => [[ s], [0], [0]],
    KeyQ:  (s) => [[0], [ s], [0]],
    KeyE:  (s) => [[0], [-s], [0]]
};

// ---------- App factory ----------
export function createScene(canvas) {
    // Scene
    const viewer = new Viewer(canvas, { drawGrid: true });
    const cube = new Entity({ position: [0, 0, 5], mesh: CUBE_MESH });
    const camera = new Camera({ position: [0, 0, 0], zoom: 600, near: 0.01 });

    // Modes and runtime state
    let fpsMode = true;                  // true = FPS world-up yaw, false = free-fly
    let trackEnabled = false;            // Enter toggles
    let controlsEnabled = false;         // set when pointer locked or touch captured
    let activePointerId = null;          // for touch/stylus
    let lastX = 0;
    let lastY = 0;

    const held = new Set();
    let shiftHeld = false;

    // Camera velocity estimation
    let camVel = [0, 0, 0];
    let prevCamPos = camera.position.slice();
    let lastTime = performance.now();

    // ---------- Helpers ----------
    function localMoveFromHeld(heldSet, vectorMap, step) {
        let x = 0;
        let y = 0;
        let z = 0;

        for (const code of heldSet) {
            const gen = vectorMap[code];
            if (gen) {
                const vv = gen(step);
                x += vv[0][0];
                y += vv[1][0];
                z += vv[2][0];
            }
        }
        return [x, y, z];
    }

    function updateCameraVelocity(dt) {
        const delta = vsub(camera.position, prevCamPos);
        camVel = vscale(delta, 1 / (dt || 1e-6));
        prevCamPos = camera.position.slice();
    }

    // ---------- Input wiring ----------
    canvas.addEventListener("click", () => {
        if (document.pointerLockElement !== canvas) {
            canvas.requestPointerLock?.();
        }
    });

    document.addEventListener("pointerlockchange", () => {
        controlsEnabled = (document.pointerLockElement === canvas) || (activePointerId !== null);
    });

    canvas.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse") {
            return;
        }
        activePointerId = e.pointerId;
        canvas.setPointerCapture(activePointerId);
        controlsEnabled = true;
        lastX = e.clientX;
        lastY = e.clientY;
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("pointermove", (e) => {
        if (!controlsEnabled) {
            return;
        }

        const sens = (e.pointerType === "mouse") ? TUNE.mouseSensitivity : TUNE.touchSensitivity;
        let dx = 0;
        let dy = 0;

        if (document.pointerLockElement === canvas && e.pointerType === "mouse") {
            dx = e.movementX || 0;
            dy = e.movementY || 0;
        } else if (e.pointerId === activePointerId) {
            dx = e.clientX - lastX;
            dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            e.preventDefault();
        } else {
            return;
        }

        const yaw = dx * sens;
        const pitch = -dy * sens;

        if (fpsMode) {
            // World-up yaw, then pitch about camera-right (pre-multiply)
            const qYawWorld = quatFromAxisAngle([0, 1, 0], yaw);
            let q = quatMultiply(qYawWorld, camera.rotation);
            const right = quatRotateVector(q, [1, 0, 0]);
            const qPitchRight = quatFromAxisAngle(right, pitch);
            q = quatMultiply(qPitchRight, q);
            camera.rotation = quatNormalize(q);
        } else {
            // Free-fly: local yaw then local pitch (right-multiply)
            let q = quatMultiply(camera.rotation, quatFromAxisAngle([0, 1, 0], yaw));
            q = quatMultiply(q, quatFromAxisAngle([1, 0, 0], pitch));
            camera.rotation = quatNormalize(q);
        }

        if (camera.rotation[0] < 0) {
            camera.rotation = camera.rotation.map(v => -v);
        }
    }, { passive: false });

    canvas.addEventListener("pointerup", (e) => {
        if (e.pointerId === activePointerId) {
            canvas.releasePointerCapture(activePointerId);
            activePointerId = null;
            controlsEnabled = (document.pointerLockElement === canvas);
        }
    }, { passive: false });

    canvas.addEventListener("pointercancel", (e) => {
        if (e.pointerId === activePointerId) {
            canvas.releasePointerCapture(activePointerId);
            activePointerId = null;
            controlsEnabled = (document.pointerLockElement === canvas);
        }
    });

    document.addEventListener("keydown", (e) => {
        if (!controlsEnabled) {
            return;
        }
        if (NAV_KEYS.has(e.code)) {
            e.preventDefault();
        }

        held.add(e.code);

        if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
            shiftHeld = true;
        }
        if (e.code === "KeyF") {
            fpsMode = !fpsMode;
        }
        if (e.code === "Enter") {
            trackEnabled = !trackEnabled;
        }
    }, { passive: false });

    document.addEventListener("keyup", (e) => {
        held.delete(e.code);

        if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
            shiftHeld = held.has("ShiftLeft") || held.has("ShiftRight");
        }
    }, { passive: false });

    // ---------- Per-frame updates ----------
    function moveCube(dt) {
        // Rotation (local R/P/Y)
        let dq = null;
        const sign = shiftHeld ? -1 : 1;
        if (held.has("KeyR")) {
            dq = (dq ?? [1, 0, 0, 0]);
            dq = quatMultiply(dq, quatFromAxisAngle([0, 0, 1], sign * TUNE.cubeTurnRate * dt));
        }
        if (held.has("KeyP")) {
            dq = (dq ?? [1, 0, 0, 0]);
            dq = quatMultiply(dq, quatFromAxisAngle([1, 0, 0], sign * TUNE.cubeTurnRate * dt));
        }
        if (held.has("KeyY")) {
            dq = (dq ?? [1, 0, 0, 0]);
            dq = quatMultiply(dq, quatFromAxisAngle([0, 1, 0], sign * TUNE.cubeTurnRate * dt));
        }
        if (dq) {
            cube.rotation = quatNormalize(quatMultiply(cube.rotation, dq));
            if (cube.rotation[0] < 0) {
                cube.rotation = cube.rotation.map(v => -v);
            }
        }

        // Translation (arrows + PageUp/Down) in local space
        const step = TUNE.cubeMoveRate * dt;
        const vLocal = localMoveFromHeld(held, LOCAL_MOVE_VECTORS, step);
        if (vLocal[0] || vLocal[1] || vLocal[2]) {
            const world = quatRotateVector(cube.rotation, vLocal);
            cube.position = vadd(cube.position, world);
        }
    }

    function controlView(dt) {
        // Camera translation (WASD + QE) in local space
        const step = TUNE.camMoveRate * dt;
        const vLocal = localMoveFromHeld(held, VIEW_VECTORS, step);
        if (vLocal[0] || vLocal[1] || vLocal[2]) {
            const world = quatRotateVector(camera.rotation, vLocal);
            camera.position = vadd(camera.position, world);
        }

        // Zoom
        if (held.has("KeyZ")) {
            const sign = shiftHeld ? -1 : 1;
            camera.zoom += sign * TUNE.zoomRate * dt;
            if (camera.zoom < 10) {
                camera.zoom = 10;
            }
        }
    }

    function updateTracking(dt) {
        if (!trackEnabled) {
            return;
        }

        // Predict camera future position
        const target = vadd(camera.position, vscale(camVel, TUNE.leadTime));
        const toCam = vsub(target, cube.position);

        cube.rotation = shortestArcStep(
            cube.rotation,
            [0, 0, 1],                      // cube's local +Z is "forward"
            toCam,                           // desired world forward
            TUNE.maxTrackingTurnRate * dt,   // capped step
            [0, 1, 0],                       // world up
            TUNE.rollStabilize * dt          // roll correction per frame
        );
    }

    // ---------- Main loop ----------
    function tick(now = performance.now()) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        updateCameraVelocity(dt);
        moveCube(dt);
        controlView(dt);
        updateTracking(dt);

        viewer.render({ camera, entities: [cube], withGrid: true });
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    // Expose a tiny control surface for debugging/tweaking
    return {
        viewer,
        cube,
        camera,
        state: {
            get fpsMode() { return fpsMode; },
            set fpsMode(v) { fpsMode = !!v; },
            get trackEnabled() { return trackEnabled; },
            set trackEnabled(v) { trackEnabled = !!v; }
        },
        TUNE
    };
}
