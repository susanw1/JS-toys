export class Viewer {
    constructor(canvas, { renderer, drawGrid = true } = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.renderer = renderer;   // e.g., new WireframeRenderer(this.ctx)
        this.drawGrid = drawGrid;
    }

    render({ camera, entities, withGrid = this.drawGrid }) {
        this.renderer.render(camera, entities, { withGrid });
    }
}
