// Follows the PlayerSession's selected camera asset into the player's render camera.
export class PlayerCameraSystem {
    constructor(player) {
        this.player = player;
    }

    step(dt) {
        // In free-cam mode, do not overwrite the render camera.
        if (this.player && this.player.followView === false) {
            return;
        }

        const player = this.player;
        const host = player.controlledEntity;
        const renderCamera = player.camera;
        if (!host || !renderCamera) {
            return;
        }

        const activeId = player.view ? player.view.activeCameraId : null;
        if (!activeId) {
            return;
        }

        // Find the active camera asset in the possessed entity's tree
        let active = null;
        host.iterateAssets((a) => {
            if (a.id === activeId) {
                active = a;
                return false; // prune
            }
        });
        if (!active) {
            return;
        }

        const Tw = active.worldTransform();

        renderCamera.position = Tw.pos.slice();
        renderCamera.rotation = Tw.rot.slice();

        if (active.zoom != null) {
            renderCamera.zoom = active.zoom;
        }
        if (active.near != null) {
            renderCamera.near = active.near;
        }
    }
}
