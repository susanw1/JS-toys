import { Asset } from "./asset.js";
import { CAP } from "../core/caps.js";

export class CameraAsset extends Asset {
    constructor(opts = {}) {
        super({ kind: "camera", ...opts });
        this.name = opts.name || "Camera";
        this.zoom = (opts.zoom ?? null);
        this.near = (opts.near ?? null);
    }

    getCapabilities() {
        return { [CAP.cameraFeed]: true };
    }

    getActions() {
        return [];    // keep empty so only the global KeyC binding is used
    }
}
