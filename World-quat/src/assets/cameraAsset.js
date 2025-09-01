import { Asset } from "./asset.js";

function camerasOn(host) {
    const out = [];
    if (!host?.mounts) {
        return out;
    }
    for (const id in host.mounts) {
        const a = host.mounts[id].asset;
        if (a && a.kind === "camera") {
            out.push(a);
        }
    }
    return out;
}

export class CameraAsset extends Asset {
    constructor(opts = {}) {
        super({ kind: "camera", ...opts });
        this.name = opts.name || "Camera";
        this.zoom = (opts.zoom ?? null); // null → use render camera's zoom
        this.near = (opts.near ?? null);
    }

    getCapabilities() {
        return { cameraFeed: true };
    }

    getActions() {
        return [
            {
                id: `${this.id}_cycle`,
                label: "Cycle Camera",
                type: "press",
                suggestedKeys: ["KeyC"],
                invoke: () => {
                    const host = this.host;
                    const world = host?.world;
                    if (!host || !world) {
                        return;
                    }
                    const cams = camerasOn(host);
                    if (cams.length === 0) {
                        return;
                    }
                    const cur = world.view?.activeCameraId;
                    let idx = Math.max(0, cams.findIndex(a => a.id === cur));
                    idx = (idx + 1) % cams.length;
                    world.view = (world.view || {});
                    world.view.activeCameraId = cams[idx].id;
                }
            }
        ];
    }
}
