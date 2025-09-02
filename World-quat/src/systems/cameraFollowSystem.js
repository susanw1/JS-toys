export class CameraFollowSystem {
    constructor(renderCamera, hostEntity) {
        this.renderCamera = renderCamera;
        this.host = hostEntity;
    }

    step(dt) {
        const world = this.host ? this.host.world : null;
        if (!world) {
            return;
        }

        const activeId = world.view ? world.view.activeCameraId : null;
        if (!activeId) {
            return;
        }

        let active = null;
        this.host.iterateAssets((a) => {
            if (a.id === activeId) {
                active = a;
                return false; // prune below; we found the node
            }
        });

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
