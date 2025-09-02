import { Asset } from "./asset.js";

export class CameraAsset extends Asset {
    constructor(opts = {}) {
        super({ kind: "camera", ...opts });
        this.name = opts.name || "Camera";
        this.zoom = (opts.zoom ?? null);
        this.near = (opts.near ?? null);
    }

    getCapabilities() {
        return { cameraFeed: true };
    }

    getActions() {
        return [];    // keep empty so only the global KeyC binding is used
    }
}
