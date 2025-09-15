import test from 'node:test';
import assert from 'node:assert/strict';
import { approx, vecApprox } from '../test-helpers/math.js';

import { QI, qaxis } from '../../src/math/quat.js';

import {
  vadd, vaddp, vsub, vsubp, vscale, vscalep,
  vcross, vcrossp, vdot, vlen, vnorm, vnormp, vqrot,
  clamp, clampUnit
} from '../../src/math/vec3.js';



test('vadd allocates and does not mutate inputs', () => {
  const a = [1, 2, 3], b = [4, 5, 6];
  const c = vadd(a, b);
  assert.ok(vecApprox(c, [5, 7, 9]));
  assert.ok(vecApprox(a, [1, 2, 3]));
  assert.ok(vecApprox(b, [4, 5, 6]));
});

test('vaddp mutates first arg and returns same reference', () => {
  const a = [1, 2, 3], b = [4, 5, 6];
  const r = vaddp(a, b);
  assert.equal(r, a);
  assert.ok(vecApprox(a, [5, 7, 9]));
});

test('vsub / vsubp', () => {
  assert.ok(vecApprox(vsub([5,7,9], [1,2,3]), [4,5,6]));
  const a = [5,7,9]; vsubp(a, [1,2,3]);
  assert.ok(vecApprox(a, [4,5,6]));
});

test('vscale / vscalep', () => {
  assert.ok(vecApprox(vscale([1,2,3], 2), [2,4,6]));
  const a = [1,2,3]; vscalep(a, 3);
  assert.ok(vecApprox(a, [3,6,9]));
});

test('vdot & vlen', () => {
  assert.equal(vdot([1,2,3],[4,5,6]), 32);
  assert.ok(approx(vlen([3,4,12]), 13));
});

test('vnorm returns new unit-length vector; vnormp normalizes in place', () => {
  const a = [3, 0, 4];
  const n = vnorm(a);
  assert.ok(vecApprox(n, [3/5, 0, 4/5]));
  assert.ok(vecApprox(a, [3, 0, 4])); // unchanged

  const b = [0, 0, 0];
  const m = vnorm(b); // zero stays zero
  assert.ok(vecApprox(m, [0,0,0]));

  const c = [10, 0, 0];
  vnormp(c);
  assert.ok(vecApprox(c, [1, 0, 0]));
});

test('vcross / vcrossp (right-handed)', () => {
  const i = [1,0,0], j = [0,1,0], k = [0,0,1];
  assert.ok(vecApprox(vcross(i, j), k));
  const a = [0,0,1]; vcrossp(a, i); // k × i = j
  assert.ok(vecApprox(a, j));
});

test('clamp / clampUnit', () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-2, 0, 3), 0);
  assert.equal(clamp(2, 0, 3), 2);
  assert.equal(clampUnit(2), 1);
  assert.equal(clampUnit(-7), -1);
});

// ---------- rotate vector ----------

test('vqrot: 90° about Z maps X->Y', () => {
    const q = qaxis([0, 0, 1], Math.PI / 2);
    const v = [1, 0, 0];
    const expected = [0, 1, 0];
    assert.ok(vecApprox(vqrot(v, q), expected, 1e-8));
});


test('vqrot: identity does nothing', () => {
    const v = [0.3, -4.2, 0.7];
    assert.ok(vecApprox(vqrot(v, QI), v));
});
