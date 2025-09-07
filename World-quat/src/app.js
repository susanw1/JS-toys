// src/app.js
import { World } from "./world/world.js";
import { Camera } from "./core/camera.js";
import { Viewer } from "./render/viewer.js";
import { WireframeRenderer } from "./render/wireframeRenderer.js";
import { Cube } from "./entities/cube.js";
import { Asset } from "./assets/asset.js";
import { MeshShape } from "./shapes/mesh.js";

import { Player } from "./player/player.js";
import { PlayerSession } from "./player/playerSession.js";
import { PlayerCameraSystem } from "./systems/playerCameraSystem.js";
import { BotSession } from "./player/botSession.js";

import { InputManager } from "./input/inputManager.js";
import { PlayerController } from "./controllers/playerController.js";
import { CameraController } from "./controllers/cameraController.js";
import { TrackingSystem } from "./systems/trackingSystem.js";

import { makeTransform } from "./math/transform.js";
import { CameraAsset } from "./assets/cameraAsset.js";
import { WeaponAsset } from "./assets/weaponAsset.js";
import { WeaponEventsSystem } from "./systems/weaponEventsSystem.js";
import { MotorAsset } from "./assets/motorAsset.js";

import { quatFromAxisAngle, quatNormalizePositive } from "./math/quat.js";
import { printTree } from "./debug/printTree.js";

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

    cube.addMount({ id: "top", slot: "hardpoint", transform: makeTransform([0, 0.9, 0]) });
    const dummy = new Asset({ kind: "dummy", mesh: cubeShape.scaledMesh(0.5, 1, 0.5) }); // reuse cube mesh to see it draw
    dummy.local.pos = [0, 0.5, 0]; // offset above
    dummy.local.rot = quatFromAxisAngle([1, 0, 0], Math.PI / 8);
    cube.fitAsset(dummy, "top");

    const camera = new Camera({ position: [0, 0, 0], zoom: 600, near: 0.01 });

    const wireRenderer = new WireframeRenderer(canvas.getContext("2d"));
    const viewer = new Viewer(canvas, { renderer: wireRenderer, drawGrid: true });

    // Input + controllers/systems
    const inputMgr = new InputManager(canvas);

    // Mounts on the cube
    cube.addMount({ id: "head",  slot: "hardpoint", transform: makeTransform([0, 0.9, 0]) });
    cube.addMount({ id: "handR", slot: "hardpoint", transform: makeTransform([0.7, 0.0, 0.4]) });
    cube.addMount({ id: "core", slot: "hardpoint", transform: makeTransform([0, 0, 0]) });

    // Fit assets
    const headCam = new CameraAsset({ name: "HeadCam" });
    cube.fitAsset(headCam, "head");

    const gun = new WeaponAsset({ fireRate: 5, magSize: 6 });
    gun.local.pos = [0.0, -0.12, 0.25];
    gun.mesh = cubeShape.scaledMesh(0.25, 0.25, 0.60);
    gun.spinRate = 0.8;
    gun.spinAxis = [0, 1, 0]; // spin around local up instead
    cube.fitAsset(gun, "handR");

    // give the gun a 'barrel' mount and fit the barrel cam there
    gun.addMount({ id: "barrel", slot: "hardpoint" });
    const barrelCam = new CameraAsset({ name: "BarrelCam" });
    barrelCam.local.pos = [0.0, 0.0, 0.35]; // just forward along local +Z
    gun.fitAsset(barrelCam, "barrel");

    const motor = new MotorAsset({ linearSpeed: 3.0, angularSpeed: 1.6 });
    cube.fitAsset(motor, "core");

    // Create player with its own action map and render camera
    const player = new PlayerSession(world, { camera, inputMgr: inputMgr });

    // Possess the cube and bind its actions
    player.setControlledEntity(cube);
    world.addController(player);

    // Start on the head camera
    player.view.activeCameraId = headCam.id;

    // Systems for these assets
    world.addSystem(new PlayerCameraSystem(player), "post");
    world.addSystem(new WeaponEventsSystem(), "post");

   // register any pre-fitted assets here later
    world.addController(new PlayerController(cube,  inputMgr, TUNE));
    world.addController(new CameraController(camera, inputMgr, TUNE, player));
    world.addSystem(new TrackingSystem(cube, camera, inputMgr, TUNE));

    // Create a bot-controlled cube
    const botShape = cubeShape; // reuse
    const botCube = new Cube({ shape: botShape, position: [4, 0, 8] });
    world.add(botCube);

    // Mounts + assets on the bot (head cam + gun + barrel cam)
    botCube.addMount({ id: "head",  slot: "hardpoint", transform: makeTransform([0, 0.9, 0]) });
    botCube.addMount({ id: "handR", slot: "hardpoint", transform: makeTransform([0.7, 0.0, 0.4]) });
    botCube.addMount({ id: "core", slot: "hardpoint", transform: makeTransform([0, 0, 0]) });

    const botHeadCam = new CameraAsset({ name: "BotHeadCam" });
    botCube.fitAsset(botHeadCam, "head");

    const botGun = new WeaponAsset({ fireRate: 4, magSize: 6 });
    botGun.local.pos = [0.0, -0.12, 0.25];
    botGun.mesh = botShape.scaledMesh(0.22, 0.22, 0.56);
    botCube.fitAsset(botGun, "handR");

    botGun.addMount({ id: "barrel", slot: "hardpoint" });
    const botBarrelCam = new CameraAsset({ name: "BotBarrelCam" });
    botBarrelCam.local.pos = [0.0, 0.0, 0.35];
    botGun.fitAsset(botBarrelCam, "barrel");

    // Spin the bot’s gun slowly too (optional)
    botGun.spinRate = 0.3;
    botGun.spinAxis = [0, 1, 0];

    const botMotor = new MotorAsset({ linearSpeed: 2.6, angularSpeed: 1.2 });
    botCube.fitAsset(botMotor, "core");

    // Make a bot session and possess the bot cube
    const bot = new BotSession(world);
    bot.setControlledEntity(botCube);
    world.addController(bot);

    // Create model players (world-level)
    const humanPlayer = new Player({ id: "P1", name: "You", team: 1, isHuman: true });
    const botPlayer   = new Player({ id: "B1", name: "Bot 1", team: 2, isHuman: false });
    world.addPlayer(humanPlayer);
    world.addPlayer(botPlayer);

    cube.setOwner(humanPlayer);
    botCube.setOwner(botPlayer);

    printTree(cube, { showCaps: true, showIds: true });

    // One per-player binding for C → cycle cameras on the possessed entity
    player.registerGlobal({
        id: "player_cycle_camera",
        label: "Cycle Camera",
        type: "press",
        suggestedKeys: ["KeyC"],
        invoke: () => {
            const cams = player.controlledEntity.findAssetsByKind("camera");
            if (!cams.length) {
                return;
            }
            const curId = player.view.activeCameraId;
            let idx = cams.findIndex(a => a.id === curId);
            idx = (idx < 0) ? 0 : (idx + 1) % cams.length;
            player.view.activeCameraId = cams[idx].id;
        }
    });
    player.registerGlobal({
        id: "player_toggle_freecam",
        label: "Toggle Free Cam",
        type: "toggle",
        suggestedKeys: ["KeyV"],
        invoke: ({ toggled }) => {
            player.followView = !player.followView;
        }
    });

    // Timing
    let lastTime = performance.now();

    function tick(now = performance.now()) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        world.step(dt);
        viewer.render({ camera, entities: world.entities, withGrid: true });

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
