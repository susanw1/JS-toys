// Copies the active camera asset pose into the render camera each frame.
export class CameraFollowSystem {
    constructor(renderCamera, hostEntity) {
        this.renderCamera = renderCamera;
        this.host = hostEntity;
    }

    step(dt) {
        const world = this.host?.world;
        if (!world) {
            return;
        }
        const activeId = world.view?.activeCameraId;
        if (!activeId) {
            return; // no active asset → leave manual control
        }

        let active = null;
        for (const id in this.host.mounts) {
            const a = this.host.mounts[id].asset;
            if (a && a.id === activeId) {
                active = a;
                break;
            }
        }
        if (!active) {
            return;
        }

        const Tw = active.worldTransform();
        this.renderCamera.position = Tw.pos.slice();
        this.renderCamera.rotation = Tw.rot.slice();

        if (active.zoom != null) {
            this.renderCamera.zoom = active.zoom;
        }
        if (active.near != null) {
            this.renderCamera.near = active.near;
        }
    }
}
