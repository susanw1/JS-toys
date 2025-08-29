import { createScene } from "./app.js";

const canvas = document.getElementById("gameCanvas");

// Optional HiDPI scale
function resizeCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = canvas.clientWidth || 900;
    const cssH = canvas.clientHeight || 600;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

createScene(canvas);
