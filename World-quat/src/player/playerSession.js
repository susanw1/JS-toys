import { ActionMap } from "../input/actionMap.js";

export class PlayerSession {
    constructor(world, { camera = null, inputMgr = null, player = null } = {}) {
        this.world = world;
        this.camera = camera;       // render camera for this player
        this.inputMgr = inputMgr;   // InputManager (for humans); bots may not have one

        this.player = player || null;     // NEW: link to model player

        this.actionMap = new ActionMap();
        this.controlledEntity = null;    // Entity this player possesses
        this.view = { activeCameraId: null }; // per-player active camera

        this.#globalActions = [];
    }

    step(dt) {
        this.processInput();
    }

    processInput() {
        if (this.inputMgr) {
            this.actionMap.process(this.inputMgr);
        }
    }

    setControlledEntity(entity) {
        this.controlledEntity = entity;
        if (this.player) {
            this.player.controlledEntity = entity;
        }
        // Rebuild action map to reflect this entity's assets
        this.rebindActions();
    }

    registerGlobal(action) {
        this.#globalActions.push(action);
        this.actionMap.registerGlobal(action);
    }

    // Rebuild the action map: all actions from the controlled entity's asset tree
    rebindActions() {
        // simplest: replace the map to avoid residual bindings
        this.actionMap = new ActionMap();

        const host = this.controlledEntity;
        if (host) {
            host.iterateAssets((a) => {
                this.actionMap.registerAsset(a);
            });
        }

        // reapply global actions (e.g., KeyC to cycle cameras)
        for (const g of this.#globalActions) {
            this.actionMap.registerGlobal(g);
        }
    }

    #globalActions;
}
