# Project snapshot for the next session

## Project URLs

* Javascript Sources: https://github.com/susanw1/JS-toys/tree/main/World-quat/src
* Raw root: https://raw.githubusercontent.com/susanw1/JS-toys/refs/heads/main/World-quat/src/
* This file: https://raw.githubusercontent.com/susanw1/JS-toys/refs/heads/main/World-quat/src/README.md

## What we’re building (the goal)

A tiny, clean **3D wireframe sandbox** that can grow into a game:

* **Quaternion-based** transforms; **Y-up**, forward = **+Z**.
* **Entity-with-assets** architecture: an entity is a rig; **assets** (camera, motor, weapon, tracker, etc.) mount onto it, own their **local mechanics**, and can be re-fitted or reused.
* A **World** that orchestrates frames with strict phases so there’s **no old+new state mixing**:

    1. **Pre**: controllers & “brain” logic decide → write **intents** (no transforms).
    2. **Integrate**: entities/assets **`update(dt)`** → the **only** place transforms mutate.
    3. **Post**: read-only systems (camera follow, event consumers) + render.
* Multi-player ready: a human **PlayerSession** and **BotSession(s)**; players can **possess** an entity and **cycle cameras** (head cam / barrel cam, etc.).

---

## Code style (agreed house rules)

* **Formatting:** 4-space indent, spaces around operators, **braced blocks**, readable spacing (no dense one-liners).
* **Private state:** use **`#field`** for private members (prefer strictness over “defensive” code).
* **Runtime strictness:** avoid optional chaining in hot paths; it’s OK only where the world may legitimately be absent (e.g., prefab assembly in `fitAsset` / `unfitAsset`).
* **Events:** single signature
  `world.emit(type, payload = {}, source = null)`
  and use **`EV.*`** constants (no string literals).
* **Capabilities:** capability-driven indexing (`world.byCap`) and queries.
  `kind` = identity; `capabilities` = behavior flags; `slot` (mount category) = where it fits.
* **Mount records:** `{ id, slot, transform, accepts, asset: null }` (use `null`, don’t `delete`).
* **Encapsulation:** assets own their **mechanics** (weapon cooldown/firing, motor movement, camera feel, tracking logic). Systems **react** (e.g., spawn projectiles) and **never poke internal fields**.
* **Phases discipline:**

    * **Pre:** compute & enqueue; write **intents** and request events only.
    * **Integrate:** `update(dt)` applies movement/rotation; emits **result** events.
    * **Post:** read final transforms; consume events; copy camera pose; render.
* **Transforms:** use **`worldTransform()`** for composed poses; renderer does near-plane clipping; **hoist** `qInv` outside loops.
* **Vec3 helpers:** prefer `vadd`, `vsub`, `vscale` over manual component math, but prefer quaternions over 3d matrices.
* **Behavior over flags:** prefer small assets (Tracker, Motor) to booleans sprinkled across systems.
* **Small diffs:** keep patches minimal and local; preserve file layout, variable names, comments and style to keep git diffs tidy.

---

## How to work with you (my notes to future-me)

* You like **small, surgical patches** that drop in without churn; avoid sweeping refactors unless necessary.
* Prefer **clarity to cleverness**. Don’t hide behavior behind defensive conditionals; fix the root contract.
* Keep answers **focused on the current bug/feature**; mention but park “future ideas” until the immediate issue is resolved.
* When asking for code, you want **ready-to-paste** snippets in the project’s style.
* You often provide **raw GitHub links**; verify against those, not memory.
* You appreciate **quick sanity check helpers** (asserts, tiny logs), then remove them.
* Keyboard mapping matters (WASD for free-cam, Arrow keys for entity via motor). Don’t mix them up.
* When the UI “feels wrong,” first suspect **frame phase** or **self-targeting** (e.g., tracking your own active camera).

---

## Unfinished business / next steps

**(We listed 8; here’s what’s still open)**

2. **Tracking → intents (asset-based)**

    * Implement **`TrackerAsset`** to compute yaw/pitch error vs a world point and call `motor.addTurnRadians(...)`.
    * Remove the old `TrackingSystem`.
    * Ensure it **doesn’t track self** (when viewing from a camera mounted on the same host).

3. **Motor options**

    * Add/verify: `space: "local" | "world"`, `worldUpYaw: boolean`, `clearIntentEachFrame`.
    * Controllers only set **intents**; Motor decides application.

4. **Camera follow = pure read**

    * Ensure `PlayerCameraSystem` runs in **post** and **always copies** from `activeCameraAsset.worldTransform()` (camera “feel” off for now).

5. **Projectiles & damage (vertical slice)**

    * Add `Projectile` entity + simple kinematics/lifetime.
    * Add `HealthAsset`.
    * Add systems: `ProjectileSpawnerSystem` (consumes `EV.weapon_fired`), `CollisionDamageSystem` (emits `entity_damaged` / `entity_destroyed`), `ScoreSystem` (consumes destruction → `score_awarded`).
    * Minimal hit test first (ray/segment vs AABB or sphere).

6. **Renderer micro-opts**

    * Optional **transform cache** (post-integrate) so renderer and targeting reuse results.
    * Keep near-plane clipping; ensure **HiDPI** sizing stays.

(Already done: **1**, **4**, **6**; and **removed `shortestArc`**.)

---

## What’s in the code now (and why it matters)

* **`world/world.js`** *(pivotal)*
  Orchestrates **pre → integrate → post**; owns `preSystems`/`postSystems`, controllers, entities; **registers/unregisters asset trees**; sets/clears asset `#world`; maintains **capability indexes**; emits & drains events.

* **`assets/asset.js`** *(pivotal)*
  Base asset with **mounts**, `fitAsset`/`unfitAsset`, `worldTransform()`, **private `#world`** (managed by World), `update(dt)`. Backbone for modular behavior.

* **`assets/motorAsset.js`** *(pivotal)*
  Holds **intents** (`move`, `turn`, `turnRad`) and applies them in integrate; supports **local/world** space and optional **world-up yaw**. Uses `vscale`/`vadd`.

* **`assets/weaponAsset.js`**
  Owns **ammo/cooldown**; on trigger → emits **`EV.weapon_fired` / `EV.weapon_empty` / `EV.weapon_reloaded`**. No global system mutates it.

* **`systems/weaponEventsSystem.js`**
  **Post** consumer of weapon events (spawn projectiles later). Thin by design.

* **`assets/cameraAsset.js` + `systems/playerCameraSystem.js`** *(pivotal together)*
  PlayerCameraSystem (**post**) picks the **active camera asset** on the controlled entity and **copies world pose** into the render `Camera`. Camera “feel” (lag/shake) currently **off**; if reintroduced, it belongs **inside** `CameraAsset`.

* **`controllers/playerController.js` / `controllers/cameraController.js` / `player/*Session.js`**
  Sessions/controllers convert input into **intents** (e.g., arrows → motor.addMove/Turn; `C` → cycle cameras and emit **`EV.camera_changed`**). They **don’t** mutate transforms.

* **`render/*`**
  `wireframeRenderer` projects with **near-plane clipping**, **Y-up**, hoisted `qInv`. `viewer` is a thin host.

* **`math/*`**
  Quaternions & transforms (normalize-positive, multiply, rotate); `transform.compose` for world poses; `vec3` helpers (`vadd`/`vsub`/`vscale`).
  **`shortestArc` removed** (replaced by tracker + motor approach).

* **`core/events.js`**
  Event constants `EV` and the queue wrapper—keeps event names consistent and payloads uniform.

* **`shapes/mesh.js`**
  `MeshShape` supports `scaledMesh(...)` so **scale is baked** into meshes (no per-entity scaling).

* **`debug/printTree.js`**
  Visualizes the **asset tree** (ids, caps, slots). Handy for spotting mount mistakes.

---

## Quick checklists (handy in a fresh session)

* **Seat sliding?**
  `PlayerCameraSystem` is **post**, reads **`worldTransform()`**, and any tracker **doesn’t track self**.

* **Cube won’t move?**
  Ensure **MotorAsset** is fitted, controller writes **intents**, motor `update(dt)` clears intents each frame.

* **Events missing?**
  Runtime emits use **`this.world.emit(EV.*)`** (only `fit/unfit` use `?.`).

* **Cap query empty?**
  `world.add(entity)` must call `registerAssetTree(entity.root)`; `fitAsset` must call `this.world.registerAssetTree(asset)` (now valid with asset `#world`).
