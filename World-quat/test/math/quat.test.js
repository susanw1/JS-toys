import test from 'node:test';
import assert from 'node:assert/strict';
import {
    QI,
    qid,
    qnorm,
    qnormpos,
    qmul,
    qaxis,
    qrot,
    qconj,
    qmat,
} from '../../src/math/quat.js';

// Representation: [w, x, y, z]

// ---------- numerics & helpers ----------
const EPS = 1e-9;
const approx = (a, b, e = EPS) => Math.abs(a - b) <= e;
const vecApprox = (a, b, e = EPS) =>
    approx(a[0], b[0], e) && approx(a[1], b[1], e) && approx(a[2], b[2], e);
const qlen = (q) => Math.hypot(q[0], q[1], q[2], q[3]);

// Compare quaternions up to sign (q ~ -q)
function quatApprox(a, b, e = EPS) {
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

const I = Object.freeze([1, 0, 0, 0]);

function axisAngle(axis, angle) {
    const L = Math.hypot(axis[0], axis[1], axis[2]) || 1;
    const x = axis[0] / L, y = axis[1] / L, z = axis[2] / L;
    const s = Math.sin(angle / 2), c = Math.cos(angle / 2);
    return [c, x * s, y * s, z * s];
}

function matMulVec3(m, v) {
    return [
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
        m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
    ];
}

function det3(m) {
    return (
        m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
        m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
        m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
    );
}

// ---------- identity ----------

test('quatIdentity returns [1,0,0,0]', () => {
    assert.deepEqual(qid(), [1, 0, 0, 0]);
});

test('QI is [1,0,0,0] and immutable', () => {
    assert.deepEqual(QI, [1, 0, 0, 0]);
    assert.ok(Object.isFrozen(QI)); // sanity check

    // attempts to mutate should throw in strict mode
    assert.throws(() => { QI[0] = 0; }, TypeError);        // write element
    assert.throws(() => { QI.push(99); }, TypeError);      // structural change
    assert.throws(() => { delete QI[0]; }, TypeError);     // delete element
    assert.throws(() => { Object.defineProperty(QI, 0, { value: 2 }); }, TypeError); // redefine
});

// ---------- normalization ----------

test('qnorm returns unit length and does not mutate input', () => {
    const a = [2, 0, 0, 2];
    const n = qnorm(a);
    assert.ok(approx(qlen(n), 1));
    assert.deepEqual(a, [2, 0, 0, 2]);
});

test('qnormpos: allocating; keeps +w, flips -w, zero -> identity; does not mutate input', () => {
    // unit +w returns a NEW array equal to input, original not mutated
    const u = [1, 0, 0, 0];
    const copyU = u.slice();
    const r = qnormpos(u);
    assert.notEqual(r, u);
    assert.deepEqual(u, copyU);
    assert.ok(quatApprox(r, [1, 0, 0, 0]));
    assert.ok(r[0] >= 0);

    // -identity flips to +identity (allow for -0 components)
    const negI = qnormpos([-1, 0, 0, 0]);
    assert.ok(quatApprox(negI, [1, 0, 0, 0]));
    assert.ok(negI[0] >= 0);

    // scaled negative w normalizes and flips sign (handle -0)
    const s = qnormpos([-2, 0, 0, 0]);
    assert.ok(quatApprox(s, [1, 0, 0, 0]));
    assert.ok(s[0] >= 0);

    // zero -> identity (handle -0) and returns NEW array
    const z = [0, 0, 0, 0];
    const z2 = qnormpos(z);
    assert.notEqual(z2, z);
    assert.ok(quatApprox(z2, [1, 0, 0, 0]));
    assert.deepEqual(z, [0, 0, 0, 0]);
});

// ---------- multiplication ----------

test('qmul associativity', () => {
    const qx = axisAngle([1, 0, 0], Math.PI / 3);
    const qy = axisAngle([0, 1, 0], Math.PI / 5);
    const qz = axisAngle([0, 0, 1], Math.PI / 7);
    const lhs = qmul(qmul(qx, qy), qz);
    const rhs = qmul(qx, qmul(qy, qz));
    assert.ok(quatApprox(lhs, rhs, 1e-8));
});


test('qmul identity element', () => {
    const q = axisAngle([0, 0, 1], 0.3);
    assert.ok(quatApprox(qmul(I, q), q));
    assert.ok(quatApprox(qmul(q, I), q));
});


test('qconj: q * q* = [||q||^2, 0,0,0] and conj(conj(q)) = q', () => {
    const q = [0.5, 0.5, -0.25, 0.25];
    const conj = qconj(q);
    const prod = qmul(q, conj);
    const s2 = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
    assert.ok(quatApprox(prod, [s2, 0, 0, 0]));
    assert.deepEqual(qconj(conj), q);
});

// ---------- axis-angle ----------

test('qaxis matches closed form', () => {
    const axis = [0, 1, 0];
    const angle = -0.75;
    const q = qaxis(axis, angle);
    const expected = axisAngle(axis, angle);
    assert.ok(quatApprox(q, expected, 1e-8));
});

// ---------- rotate vector ----------

test('qrot: 90° about Z maps X->Y', () => {
    const q = qaxis([0, 0, 1], Math.PI / 2);
    const v = [1, 0, 0];
    const expected = [0, 1, 0];
    assert.ok(vecApprox(qrot(q, v), expected, 1e-8));
});


test('qrot: identity does nothing', () => {
    const v = [0.3, -4.2, 0.7];
    assert.ok(vecApprox(qrot(I, v), v));
});

// ---------- quatToMatrix ----------

test('qmat: identity -> identity matrix', () => {
    const m = qmat(I);
    assert.deepEqual(m, [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ]);
});


test('qmat: rotates vectors equivalently to quatRotateVector', () => {
    const q = qaxis([0, 0, 1], Math.PI / 2);
    const m = qmat(q);
    const v = [1, 0, 0];
    const mv = matMulVec3(m, v);
    const qv = qrot(q, v);
    assert.ok(vecApprox(mv, qv, 1e-8));
});


test('qmat: orthonormal with det ≈ +1', () => {
    const q = qaxis([1, 2, -0.5], 0.77);
    const m = qmat(q);
    // columns
    const c0 = [m[0][0], m[1][0], m[2][0]];
    const c1 = [m[0][1], m[1][1], m[2][1]];
    const c2 = [m[0][2], m[1][2], m[2][2]];
    const dot01 = c0[0]*c1[0] + c0[1]*c1[1] + c0[2]*c1[2];
    const dot02 = c0[0]*c2[0] + c0[1]*c2[1] + c0[2]*c2[2];
    const dot12 = c1[0]*c2[0] + c1[1]*c2[1] + c1[2]*c2[2];
    const len0 = Math.hypot(...c0);
    const len1 = Math.hypot(...c1);
    const len2 = Math.hypot(...c2);
    assert.ok(approx(dot01, 0, 1e-7));
    assert.ok(approx(dot02, 0, 1e-7));
    assert.ok(approx(dot12, 0, 1e-7));
    assert.ok(approx(len0, 1, 1e-7));
    assert.ok(approx(len1, 1, 1e-7));
    assert.ok(approx(len2, 1, 1e-7));
    assert.ok(approx(det3(m), 1, 1e-6));
});
