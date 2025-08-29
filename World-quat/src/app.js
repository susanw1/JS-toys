import { Entity } from "./core/entity.js";
import { Camera } from "./core/camera.js";
import { Viewer } from "./render/viewer.js";

export const CUBE_MESH = {
    vertices: [
        [-1, -0.75, -1.5], [-1, -0.75,  1.5], [-1,  0.75,  1.5], [-1,  0.75, -1.5],
        [ 1, -0.75, -1.5], [ 1, -0.75,  1.5], [ 1,  0.75,  1.5], [ 1,  0.75, -1.5]
    ],
    edges: [
        [0, 1, 2, 3, 0, 4, 5, 6, 7, 4],
        [1, 5],
        [6, 2],
        [3, 7]
    ]
};

export function createScene(canvas) {
    const viewer = new Viewer(canvas, { drawGrid: true });
    const cube = new Entity({ position: [0, 0, 5], mesh: CUBE_MESH });
    const camera = new Camera({ position: [0, 0, 0], zoom: 600, near: 0.01 });

    function tick() {
        viewer.render({ camera, entities: [cube], withGrid: true });
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
    return { viewer, cube, camera };
}
