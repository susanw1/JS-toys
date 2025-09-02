import { ActionMap } from "../input/actionMap.js";

export class PlayerSession {
    constructor(world, { camera = null, inputMgr = null } = {}) {
        this.world = world;
        this.camera = camera;       // render camera for this player
        this.inputMgr = inputMgr;   // InputManager (for humans); bots may not have one

        this.actionMap = new ActionMap();
        this.controlledEntity = null;    // Entity this player possesses
        this.view = { activeCameraId: null }; // per-player active camera
    }

    setControlledEntity(entity) {
        this.controlledEntity = entity;
        // Rebuild action map to reflect this entity's assets
        this.rebindActions();
    }

    processInput() {
        if (this.inputMgr) {
            this.actionMap.process(this.inputMgr);
        }
    }

    // Rebuild the action map: all actions from the controlled entity's asset tree
    rebindActions() {
        // simplest: replace the map to avoid residual bindings
        this.actionMap = new ActionMap();

        const host = this.controlledEntity;
        if (!host) {
            return;
        }

        // Register actions from every fitted asset (any depth)
        host.iterateAssets((a) => {
            this.actionMap.registerAsset(a);
        });
    }
}
