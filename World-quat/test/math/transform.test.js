import test from 'node:test';
import assert from 'node:assert/strict';

import { makeTransform, composeTransform, transformPoint } from '../../src/math/transform.js';
import { qaxis, qmul, qrot, qnormpos, QI } from '../../src/math/quat.js';

// ---------- numerics & helpers ----------
const EPS = 1e-9;
const approx = (a, b, e = EPS) => Math.abs(a - b) <= e;
const vecApprox = (a, b, e = EPS) =>
    approx(a[0], b[0], e) && approx(a[1], b[1], e) && approx(a[2], b[2], e);
const qlen = (q) => Math.hypot(q[0], q[1], q[2], q[3]);
function quatApprox(a, b, e = EPS) {
    // Compare up to sign
    const direct =
        approx(a[0], b[0], e) &&
        approx(a[1], b[1], e) &&
        approx(a[2], b[2], e) &&
        approx(a[3], b[3], e);
    if (direct) return true;
    return (
        approx(a[0], -b[0], e) &&
        approx(a[1], -b[1], e) &&
        approx(a[2], -b[2], e) &&
        approx(a[3], -b[3], e)
    );
}

// ---------- makeTransform ----------
test('makeTransform clones inputs (no aliasing)', () => {
    const pos = [1, 2, 3];
    const rot = [1, 0, 0, 0];
    const T = makeTransform(pos, rot);

    // values match
    assert.deepEqual(T.pos, [1, 2, 3]);
    assert.deepEqual(T.rot, [1, 0, 0, 0]);

    // mutate inputs; T should not change
    pos[0] = 99;
    rot[0] = 0;
    assert.deepEqual(T.pos, [1, 2, 3]);
    assert.deepEqual(T.rot, [1, 0, 0, 0]);

    // and T.pos/T.rot are new arrays
    assert.notEqual(T.pos, pos);
    assert.notEqual(T.rot, rot);
});

// ---------- composeTransform ----------
test('composeTransform basic: parent translate + rotate Z 90°, local at +X', () => {
    const parent = { pos: [10, 0, 0], rot: qaxis([0, 0, 1], Math.PI / 2) }; // +Z 90°
    const local = { pos: [1, 0, 0], rot: QI }; // at +X in local
    const C = composeTransform(parent, local);

    // off = qrot(parent.rot, local.pos) = rotate +X by +Z90 -> +Y
    assert.ok(vecApprox(C.pos, [10, 1, 0]));

    // rotation should be parent's rotation (since local rot is identity)
    assert.ok(quatApprox(C.rot, parent.rot));
    assert.ok(approx(qlen(C.rot), 1)); // normalized
    assert.ok(C.rot[0] >= 0); // positive hemisphere
});

test('composeTransform with local rotation (Y 90°)', () => {
    const parent = { pos: [0, 0, 0], rot: qaxis([0, 0, 1], Math.PI / 3) }; // about Z
    const local = { pos: [2, 0, 0], rot: qaxis([0, 1, 0], Math.PI / 2) };   // about Y
    const C = composeTransform(parent, local);

    // Manual expected
    const expectedRot = qnormpos(qmul(parent.rot, local.rot));
    const expectedPos = (() => {
        const off = qrot(parent.rot, local.pos);
        return [off[0] + parent.pos[0], off[1] + parent.pos[1], off[2] + parent.pos[2]];
    })();

    assert.ok(quatApprox(C.rot, expectedRot));
    assert.ok(vecApprox(C.pos, expectedPos));
});

// Associativity on points: (P ∘ L) applied to v equals P applied to (L applied to v)
test('composeTransform respects point transformation composition', () => {
    const P = { pos: [1, -2, 3], rot: qaxis([0, 0, 1], 0.4) };
    const L = { pos: [0.5, 0.25, -0.75], rot: qaxis([1, 0, 0], -0.3) };
    const v = [2, -1, 4];

    const PL = composeTransform(P, L);
    const left = transformPoint(PL, v);

    const right = transformPoint(P, transformPoint(L, v));
    assert.ok(vecApprox(left, right, 1e-8));
});

// ---------- transformPoint ----------
test('transformPoint: identity rotation just translates', () => {
    const T = { pos: [1, 2, 3], rot: QI };
    const v = [5, -6, 7];
    assert.deepEqual(transformPoint(T, v), [6, -4, 10]);
});

test('transformPoint: Z 90° then translate', () => {
    const T = { pos: [1, 2, 3], rot: qaxis([0, 0, 1], Math.PI / 2) };
    const v = [1, 0, 0];
    // rotate X -> Y, then add pos
    assert.ok(vecApprox(transformPoint(T, v), [1, 3, 3]));
});
