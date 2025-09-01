// src/app.js
import { World } from "./world/world.js";
import { Camera } from "./core/camera.js";
import { Viewer } from "./render/viewer.js";
import { WireframeRenderer } from "./render/wireframeRenderer.js";
import { Cube } from "./entities/cube.js";
import { Asset } from "./assets/asset.js";
import { MeshShape } from "./shapes/mesh.js";

import { InputManager } from "./input/inputManager.js";
import { PlayerController } from "./controllers/playerController.js";
import { CameraController } from "./controllers/cameraController.js";
import { TrackingSystem } from "./systems/trackingSystem.js";

import { makeTransform } from "./math/transform.js";
import { ActionMap } from "./input/actionMap.js";
import { CameraAsset } from "./assets/cameraAsset.js";
import { WeaponAsset } from "./assets/weaponAsset.js";
import { CameraFollowSystem } from "./systems/cameraFollowSystem.js";
import { WeaponsSystem } from "./systems/weaponsSystem.js";

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
    cube.addMount({ id: "top", category: "hardpoint", transform: makeTransform([0, 0.9, 0]) });
    const dummy = new Asset({ kind: "dummy", mesh: cube.shape.scaledMesh(0.5, 1, 0.5) }); // reuse cube mesh to see it draw
    dummy.local.pos = [0, 0.5, 0]; // offset above
    dummy.local.rot = [0.5, 1, 0, 0]; // offset above
    cube.fitAsset(dummy, "top");
    world.add(cube);

    const camera = new Camera({ position: [0, 0, 0], zoom: 600, near: 0.01 });

    const wireRenderer = new WireframeRenderer(canvas.getContext("2d"));
    const viewer = new Viewer(canvas, { renderer: wireRenderer, drawGrid: true });

    // Input + controllers/systems
    const inputMgr = new InputManager(canvas);
    // Action map
    const actionMap = new ActionMap();
    world.actionMap = actionMap;

    // Mounts on the cube
    cube.addMount({ id: "head",  category: "hardpoint", transform: makeTransform([0, 0.9, 0]) });
    cube.addMount({ id: "handR", category: "hardpoint", transform: makeTransform([0.7, 0.0, 0.4]) });

    // Fit assets
    const headCam = new CameraAsset({ name: "HeadCam" });
    cube.fitAsset(headCam, "head");

    const gun = new WeaponAsset({ fireRate: 5, magSize: 6 });
    // Reuse your instance method; you already converted it:
    // gun.mesh = cube.shape.scaledMesh(0.3, 0.3, 0.6);
    cube.fitAsset(gun, "handR");

    // Systems for these assets
    world.addSystem(new CameraFollowSystem(camera, cube));
    world.addSystem(new WeaponsSystem(cube));

   // (optional) register any pre-fitted assets here later

    world.addController(new PlayerController(cube,  inputMgr, TUNE));
    world.addController(new CameraController(camera, inputMgr, TUNE));
    world.addSystem(new TrackingSystem(cube, camera, inputMgr, TUNE));

    // Timing
    let lastTime = performance.now();

    function tick(now = performance.now()) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        world.step(dt, inputMgr);
        viewer.render({ camera, entities: [cube], withGrid: true });

        inputMgr.endFrame();
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    // Small control surface, wired to InputManager toggles
    return {
        viewer,
        cube,
        camera,
        state: {
            get fpsMode() { return inputMgr.toggles.fpsMode; },
            set fpsMode(v) { inputMgr.toggles.fpsMode = !!v; },
            get trackEnabled() { return inputMgr.toggles.trackEnabled; },
            set trackEnabled(v) { inputMgr.toggles.trackEnabled = !!v; }
        },
        TUNE
    };
}
