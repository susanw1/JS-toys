import test from 'node:test';
import assert from 'node:assert/strict';

import { CameraAsset } from '../../src/assets/cameraAsset.js';
import { makeTransform } from '../../src/math/transform.js';
import { vsub } from '../../src/math/vec3.js';
import { qaxis, QI } from '../../src/math/quat.js';

import { approx, vecApprox, quatApprox } from '../test-helpers/math.js';
import { makeWorldStub, makeEntity, mountOnEntity } from '../test-helpers/mount.js';

const dot4 = (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];
// angular distance between two (unit) quats, in radians
const qang = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(dot4(a, b))));

// -------------------- no-lag path -------------------------------------

test('camera (no lag): snaps exactly to mounted world pose', () => {
    const { world } = makeWorldStub();
    const entity = makeEntity({
        position: [10, -5, 2],
        rotation: QI,
        world
    });

    const cam = new CameraAsset({ lagPos: 0, lagRot: 0, shakeAmp: 0 });
    mountOnEntity(entity, cam, { id: 'cam' });

    cam.update(0.016);
    const t = cam.getViewTransform();

    assert.deepEqual(t.pos, [10, -5, 2]);
    assert.deepEqual(t.rot, QI);
});

//test('camera (dt=0): state does not change', () => {
//    const { world } = makeWorldStub();
//    const entity = makeEntity({ position: [1,2,3], rotation: QI, world });
//
//    const cam = new CameraAsset({ lagPos: 0.2, lagRot: 0.2, shakeAmp: 0 });
//    mountOnEntity(entity, cam, { id: 'cam' });
//
//    cam.update(0.016);                 // seed
//    const t0 = cam.getViewTransform();
//
//    // change target but use dt=0 → no change expected
//    entity.position = [9, 8, 7];
//    entity.rotation = qaxis([0,0,1], Math.PI/2);
//    cam.update(0.0);
//
//    const t1 = cam.getViewTransform();
//    assert.deepEqual(t1.pos, t0.pos);
//    assert.deepEqual(t1.rot, t0.rot);
//});


//test('camera (lag): position & rotation errors strictly decrease step-to-step', () => {
//    const { world } = makeWorldStub();
//    const entity = makeEntity({ position: [0,0,0], rotation: QI, world });
//
//    const cam = new CameraAsset({ lagPos: 0.2, lagRot: 0.2, shakeAmp: 0 });
//    mountOnEntity(entity, cam, { id: 'cam' });
//
//    cam.update(0.016); // seed state
//
//    // set fixed target
//    const targetPos = [10, 0, 0];
//    const targetRot = qaxis([0,0,1], Math.PI/2); // +Z 90°
//    entity.position = targetPos.slice();
//    entity.rotation = targetRot.slice();
//
//    // first step
//    cam.update(0.1);
//    const t1 = cam.getViewTransform();
//
//    // second step (same target)
//    cam.update(0.1);
//    const t2 = cam.getViewTransform();
//
//    // position error decreased
//    const dist = (a,b) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
//    const e1 = dist(t1.pos, targetPos);
//    const e2 = dist(t2.pos, targetPos);
//    assert.ok(e2 < e1);
//
//    // rotation error (angular distance) decreased
//    const a1 = qang(t1.rot, targetRot);
//    const a2 = qang(t2.rot, targetRot);
//    assert.ok(a2 < a1);
//
//    // quaternion remains unit with w>=0 (hemisphere)
//    const len2 = t2.rot[0]**2 + t2.rot[1]**2 + t2.rot[2]**2 + t2.rot[3]**2;
//    assert.ok(approx(Math.sqrt(len2), 1, 1e-9));
//    assert.ok(t2.rot[0] >= 0);
//});

test('camera (lag): converges close to target with repeated updates', () => {
    const { world } = makeWorldStub();
    const entity = makeEntity({ position: [0,0,0], rotation: QI, world });

    const cam = new CameraAsset({ lagPos: 0.2, lagRot: 0.2, shakeAmp: 0 });
    mountOnEntity(entity, cam, { id: 'cam' });

    cam.update(0.016); // seed

    const targetPos = [3, -4, 2];
    const targetRot = qaxis([0,1,0], Math.PI/3); // +Y 60°
    entity.position = targetPos.slice();
    entity.rotation = targetRot.slice();

    for (let i = 0; i < 30; i++) {
        cam.update(0.05);
    }

    const t = cam.getViewTransform();

    assert.ok(vecApprox(t.pos, targetPos, 1e-2));
    assert.ok(quatApprox(t.rot, targetRot, 1e-3));
});

//test('camera (shake): with shakeAmp>0, adds small jitter to position', () => {
//    const { world } = makeWorldStub();
//    const entity = makeEntity({ position: [100,200,300], rotation: QI, world });
//
//    const cam = new CameraAsset({ lagPos: 0, lagRot: 0, shakeAmp: 1.0, shakeFreq: 7 });
//    mountOnEntity(entity, cam, { id: 'cam' });
//
//    cam.update(0.016); // seed base
//    const t0 = cam.getViewTransform();
//
//    cam.update(0.05);  // advance to get non-zero shake
//    const t1 = cam.getViewTransform();
//
//    // some change occurred
//    const [dx, dy, dz] = vsub(t1.pos, t0.pos);
////    const dx = t1.pos[0] - t0.pos[0];
////    const dy = t1.pos[1] - t0.pos[1];
////    const dz = t1.pos[2] - t0.pos[2];
//    assert.ok(Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 0);
//});
