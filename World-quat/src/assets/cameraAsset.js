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
        return [];
    }
}
