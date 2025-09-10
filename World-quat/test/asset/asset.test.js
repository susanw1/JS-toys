import test from 'node:test';
import assert from 'node:assert/strict';

import { Asset } from '../../src/assets/asset.js';
import { RootAsset } from '../../src/assets/rootAsset.js';
import { makeTransform } from '../../src/math/transform.js';
import { QI, qaxis, qmul, qnormpos } from '../../src/math/quat.js';

import { approx, vecApprox, quatApprox } from '../test-helpers/math.js';
import { makeWorldStub, makeEntity, mountOnEntity } from '../test-helpers/mount.js';


// Z+ 90° quaternion
const QZ90 = qaxis([0, 0, 1], Math.PI / 2);
// Y+ 90° quaternion
const QY90 = qaxis([0, 1, 0], Math.PI / 2);
// Expected composite rotation: QZ90 * QY90 = [0.5, -0.5, 0.5, 0.5]
const QZ90_QY90 = qmul(QZ90, QY90);

// translateLocal applies local-axes motion
test('Asset.translateLocal moves along local axes', () => {
    const a = new Asset();
    a.local = makeTransform([0, 0, 0], qaxis([0, 0, 1], Math.PI / 2));
    // local +X should map to world +Y after +Z 90° rot
    a.translateLocal([1, 0, 0]);
    assert.ok(vecApprox(a.local.pos, [0, 1, 0]));

    // identity rotation: +Z translation remains +Z
    const b = new Asset();
    b.translateLocal([0, 0, 2]);
    assert.ok(vecApprox(b.local.pos, [0, 0, 2]));
});

// rotateAroundLocal matches qnormpos(qmul(old, dq))
test('Asset.rotateAroundLocal matches quaternion math', () => {
    const a = new Asset();
    a.local = makeTransform([0, 0, 0], [1, 0, 0, 0]);
    const dq = qaxis([0, 1, 0], 0.5);

    // expected rot
    const expected = qnormpos(qmul([1, 0, 0, 0], dq));

    a.rotateAroundLocal([0, 1, 0], 0.5);
    assert.ok(quatApprox(a.local.rot, expected));
});

// worldTransform with parent entity + mount transform
// P ∘ M ∘ L
// parent: translate (1,2,3) and rotate +Z 90°; mount: offset +X; local: offset +Z
// Expected: pos = parent.pos + R(parent.rot) * ( mount.pos + local.pos )
//           rot = qnormpos(parent.rot * mount.rot * local.rot)
test('Asset.worldTransform composes parent ∘ mount ∘ local', () => {
    const { world } = makeWorldStub();
    const entity = makeEntity({ position: [10,20,30], rotation: QZ90, world });

    const child = new Asset();
    // identity mount; local = [1,2,3]
    mountOnEntity(entity, child, { id: 'm0', transform: makeTransform([0,0,0], QI) });
    child.local = makeTransform([1,2,3], QI);

    const Tw = child.worldTransform();

    // Expected: rot = QZ90; pos = [10,20,30] + Rz90·[1,2,3] = [8,21,33]
    assert.ok(quatApprox(Tw.rot, QZ90));
    assert.ok(vecApprox(Tw.pos, [8, 21, 33], 1e-12));
});



// Contract: worldTransform() composes parent ∘ mount ∘ local using
//   rot = parent.rot * mount.rot * local.rot (normalized, w>=0)
//   pos = parent.pos + R(parent.rot) * mount.pos + R(parent.rot * mount.rot) * local.pos
// For this fixed case:
//   parent.pos = [1,2,3]
//   parent.rot = Z+90°
//   mount.pos  = [1,0,0]  → Rz90 → [0,1,0]
//   mount.rot  = Y+90°
//   local.pos  = [0,0,2]  → Ry90 then Rz90 → [0,2,0]
//   local.rot  = identity
//   => pos = [1,3,5], rot = [0.5,-0.5,0.5,0.5]
test('Asset.worldTransform: rotated mount', () => {
    const { world } = makeWorldStub();
    const entity = makeEntity({ position: [1,2,3], rotation: QZ90, world });

    const child = new Asset();
    // mount: pos = [1,0,0], rot = +Y 90°
    mountOnEntity(entity, child, { id: 'mRot', transform: makeTransform([1,0,0], QY90) });
    child.local = makeTransform([0,0,2], QI);

    const Tw = child.worldTransform();

    // Expected fixed numbers:
    // rot = QZ90 * QY90 * I = [0.5, -0.5, 0.5, 0.5]
    // pos = [1,2,3] + Rz90·[1,0,0] + Rz90Ry90·[0,0,2] = [1,3,5]
    const expectedRot = [0.5, -0.5, 0.5, 0.5];
    const expectedPos = [1, 5, 3];

    assert.ok(quatApprox(Tw.rot, expectedRot));
    assert.ok(vecApprox(Tw.pos, expectedPos));
});
