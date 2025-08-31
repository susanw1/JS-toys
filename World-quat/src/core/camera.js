import { Entity } from "./entity.js";
import { quatConjugate, quatRotateVector } from "../math/quat.js";

export class Camera {
    constructor(opts = {}) {
        this.position = opts.position ? opts.position.slice() : [0, 0, 0];
        this.rotation = opts.rotation ? opts.rotation.slice() : [1, 0, 0, 0];
        this.zoom = opts.zoom ?? 600;
        this.near = opts.near ?? 0.01;
    }
}
