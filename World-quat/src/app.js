// src/app.js
import { World } from "./world/world.js";
import { Camera } from "./core/camera.js";
import { Viewer } from "./render/viewer.js";
import { WireframeRenderer } from "./render/wireframeRenderer.js";
import { Cube } from "./entities/cube.js";
import { MeshShape } from "./shapes/mesh.js";

import { InputManager } from "./input/inputManager.js";
import { PlayerController } from "./controllers/playerController.js";
import { CameraController } from "./controllers/cameraController.js";
import { TrackingSystem } from "./systems/trackingSystem.js";

// ---------- Tunables ----------
export const TUNE = {
    camMoveRate: 1.0,
    zoomRate: 250,
    leadTime: 0.20,
    mouseSensitivity: 0.0025,
    touchSensitivity: 0.004,
    eps: 1e-9
};

// ---------- Mesh ----------
const CUBE_VERTS = [
    [-1, -0.75, -1.5], [-1, -0.75,  1.5], [-1,  0.75,  1.5], [-1,  0.75, -1.5],
    [ 1, -0.75, -1.5], [ 1, -0.75,  1.5], [ 1,  0.75,  1.5], [ 1,  0.75, -1.5]
];
const CUBE_EDGES = [[0,1,2,3,0,4,5,6,7,4], [1,5], [6,2], [3,7]];

// ---------- App factory ----------
export function createScene(canvas) {
    // Scene objects
    const world = new World();

    const cubeShape = new MeshShape(CUBE_VERTS, CUBE_EDGES);
    const cube = new Cube({ shape: cubeShape, position: [0, 0, 5] });
    world.add(cube);

    const camera = new Camera({ position: [0, 0, 0], zoom: 600, near: 0.01 });

    const wireRenderer = new WireframeRenderer(canvas.getContext("2d"));
    const viewer = new Viewer(canvas, { renderer: wireRenderer, drawGrid: true });

    // Input + controllers/systems
    const input = new InputManager(canvas);
    world.addController(new PlayerController(cube,  input, TUNE));
    world.addController(new CameraController(camera, input, TUNE));
    world.addSystem(new TrackingSystem(cube, camera, input, TUNE));

    // Timing
    let lastTime = performance.now();

    function tick(now = performance.now()) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        world.step(dt);
        viewer.render({ camera, entities: [cube], withGrid: true });

        input.endFrame();
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    // Small control surface, wired to InputManager toggles
    return {
        viewer,
        cube,
        camera,
        state: {
            get fpsMode() { return input.toggles.fpsMode; },
            set fpsMode(v) { input.toggles.fpsMode = !!v; },
            get trackEnabled() { return input.toggles.trackEnabled; },
            set trackEnabled(v) { input.toggles.trackEnabled = !!v; }
        },
        TUNE
    };
}
