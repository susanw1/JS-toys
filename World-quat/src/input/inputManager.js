// Centralizes input and exposes a per-frame snapshot.
// Usage per frame: controllers read fields, then call input.endFrame().

const NAV_KEYS = new Set([
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "PageUp", "PageDown", "Home", "End", "Space"
]);

export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;

        // live state
        this.enabled = false;
        this.activePointerId = null;
        this.lastX = 0; this.lastY = 0;

        this.held = new Set();
        this.shift = false;

        this.pointer = { dx: 0, dy: 0, type: "mouse" }; // movement since last frame
        this.toggles = {
            fpsMode: true,
            trackEnabled: false
        };

        // listeners
        this._onClick = () => {
            if (document.pointerLockElement !== canvas) {
                canvas.requestPointerLock?.();
            }
        };
        this._onPointerLockChange = () => {
            this.enabled = (document.pointerLockElement === canvas) || (this.activePointerId !== null);
        };
        this._onPointerDown = (e) => {
            if (e.pointerType === "mouse") return;
            this.activePointerId = e.pointerId;
            canvas.setPointerCapture(this.activePointerId);
            this.enabled = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            e.preventDefault();
        };
        this._onPointerMove = (e) => {
            if (!this.enabled) return;

            if (document.pointerLockElement === canvas && e.pointerType === "mouse") {
                this.pointer.dx += e.movementX || 0;
                this.pointer.dy += e.movementY || 0;
                this.pointer.type = "mouse";
            } else if (e.pointerId === this.activePointerId) {
                this.pointer.dx += (e.clientX - this.lastX);
                this.pointer.dy += (e.clientY - this.lastY);
                this.pointer.type = e.pointerType || "touch";
                this.lastX = e.clientX;
                this.lastY = e.clientY;
                e.preventDefault();
            }
        };
        this._onPointerUp = (e) => {
            if (e.pointerId === this.activePointerId) {
                canvas.releasePointerCapture(this.activePointerId);
                this.activePointerId = null;
                this.enabled = (document.pointerLockElement === canvas);
            }
        };

        this._onKeyDown = (e) => {
            if (!this.enabled) return;
            if (NAV_KEYS.has(e.code)) e.preventDefault();

            this.held.add(e.code);
            if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.shift = true;
            if (e.code === "KeyF") this.toggles.fpsMode = !this.toggles.fpsMode;
            if (e.code === "Enter") this.toggles.trackEnabled = !this.toggles.trackEnabled;
        };
        this._onKeyUp = (e) => {
            this.held.delete(e.code);
            if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
                this.shift = this.held.has("ShiftLeft") || this.held.has("ShiftRight");
            }
        };

        // wire
        canvas.addEventListener("click", this._onClick);
        document.addEventListener("pointerlockchange", this._onPointerLockChange);
        canvas.addEventListener("pointerdown", this._onPointerDown, { passive: false });
        canvas.addEventListener("pointermove", this._onPointerMove, { passive: false });
        canvas.addEventListener("pointerup", this._onPointerUp, { passive: false });
        canvas.addEventListener("pointercancel", this._onPointerUp);

        document.addEventListener("keydown", this._onKeyDown, { passive: false });
        document.addEventListener("keyup", this._onKeyUp, { passive: false });
    }

    endFrame() {
        this.pointer.dx = 0;
        this.pointer.dy = 0;
    }

    destroy() {
        const c = this.canvas;
        c.removeEventListener("click", this._onClick);
        document.removeEventListener("pointerlockchange", this._onPointerLockChange);
        c.removeEventListener("pointerdown", this._onPointerDown);
        c.removeEventListener("pointermove", this._onPointerMove);
        c.removeEventListener("pointerup", this._onPointerUp);
        c.removeEventListener("pointercancel", this._onPointerUp);

        document.removeEventListener("keydown", this._onKeyDown);
        document.removeEventListener("keyup", this._onKeyUp);
    }
}
