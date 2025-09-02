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

        const active = findAssetById(this.host, activeId);
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

function findAssetById(host, id) {
    const mounts = (host && host.mounts) ? host.mounts : {};
    for (const mId in mounts) {
        const a = mounts[mId].asset;
        if (!a) {
            continue;
        }
        if (a.id === id) {
            return a;
        }
        const hit = findAssetById(a, id);
        if (hit) {
            return hit;
        }
    }
    return null;
}
