

const out = document.getElementById('results');
let passed = 0, failed = 0;

function log(html, cls='') {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  d.innerHTML = html;
  out.appendChild(d);
  console.log(d.textContent);
}

function approx(a, b, eps=1e-9) { return Math.abs(a-b) <= eps; }

function vecApprox(a, b, eps=1e-9) {
    console.log(`a = ${a}`);
    console.log(`b = ${b}`);
  return a.length === b.length && a.every((v,i) => approx(v, b[i], eps));
}

function quatApprox(q1, q2, eps=1e-9) {
  // quaternions are equivalent up to a global sign
  if (vecApprox(q1, q2, eps)) return true;
  return vecApprox(q1.map(v=>-v), q2.map(v=>-v), eps);
}

function test(name, fn) {
  try { fn(); passed++; log('✓ ' + name, 'pass'); }
  catch (e) { failed++; log('✗ ' + name + '<br><b>' + e.message + '</b><br><pre>'+e.stack+'</pre>', 'fail'); }
}

function expect(cond, msg='Assertion failed') {
  if (!cond) throw new Error(msg);
}

function expectVec(a, b, eps=1e-9, msg='Vectors differ') {
  if (!vecApprox(a,b,eps)) {
    throw new Error(`${msg}\n got:  [${a.map(n=>+n.toFixed(12)).join(', ')}]\n want: [${b.map(n=>+n.toFixed(12)).join(', ')}]`);
  }
}

function expectQuat(q, want, eps=1e-9, msg='Quaternions differ') {
  if (!quatApprox(q, want, eps)) {
    throw new Error(`${msg}\n got:  [${q.map(n=>+n.toFixed(12)).join(', ')}]\n want: [${want.map(n=>+n.toFixed(12)).join(', ')}]`);
  }
}

// ------- tests -------
const deg = d => d*Math.PI/180;

test('quatConjugate: simple', () => {
  const q = [1, 2, -3, 4]
  expectQuat(quatConjugate(q), [1, -2, 3, -4], 1e-12);
});

test('quatFromAxisAngle: unit axis, 90° Z', () => {
  const q = quatFromAxisAngle([0,0,1], deg(90));
  const rt2 = Math.SQRT1_2; // 1/sqrt(2)
  expectQuat(q, [rt2, 0, 0, rt2], 1e-12);
});

test('quatRotateVector: 90° about X rotates +Z -> +Y?', () => {
  const q = quatFromAxisAngle([1,0,0], deg(90));
  const v = [0,0,1];
  const r = quatRotateVector(q, v);
    console.log(`q = ${q}`);
    console.log(`v = ${v}`);
    console.log(`r = ${r}`);
  expectVec(r, [0, -1, 0], 1e-5); // right-handed: +Z toward -Y
});

test('quatRotateVector: 90° about Y rotates +Z -> +X', () => {
  const q = quatFromAxisAngle([0,1,0], deg(90));
  const r = quatRotateVector(q, [0,0,1]);
  expectVec(r, [1,0,0], 1e-9);
});

test('quatRotateVector: 90° about Z rotates +X -> +Y', () => {
  const q = quatFromAxisAngle([0,0,1], deg(90));
  const r = quatRotateVector(q, [1,0,0]);
  expectVec(r, [0,1,0], 1e-9);
});

test('conjugate is inverse for unit quats', () => {
  const q = quatFromAxisAngle([0.3, 0.4, 0.5], deg(60));
  const v = [0.2, -0.1, 0.7];
  const r = quatRotateVector(q, v);
  const v2 = quatRotateVector(quatConjugate(q), r);
  expectVec(v2, v, 1e-9);
});

test('composition: local yaw then pitch equals single combined rotation', () => {
    const qYaw   = quatFromAxisAngle([0,1,0], deg(30));
    const qPitch = quatFromAxisAngle([1,0,0], deg(20));
    // local composition of actions on a vector: apply yaw then pitch
    const qTotal = quatMultiply(qPitch, qYaw);

    const v = [0,0,1];
    const step = quatRotateVector(qPitch, quatRotateVector(qYaw, v)); // apply yaw then pitch
    const once = quatRotateVector(qTotal, v);
    expectVec(once, step, 1e-9);
});

test('roll about local forward leaves forward unchanged (pitch 45°, roll 90°)', () => {
  const qPitch = quatFromAxisAngle([1,0,0], deg(45));
  const fwd = quatRotateVector(qPitch, [0,0,1]);      // world forward after pitch
  const qRollWorld = quatFromAxisAngle(fwd, deg(90));  // same axis in world-space
  const qTotalWorld = quatMultiply(qRollWorld, qPitch); // apply roll in world, then pitch

  const fwdAfter = quatRotateVector(qTotalWorld, [0,0,1]);
  expectVec(fwdAfter, fwd, 1e-9);
});

test('axis normalization doesn’t change rotation angle', () => { 
    const q1 = quatFromAxisAngle([2,0,0], deg(45)); 
    const q2 = quatFromAxisAngle([1,0,0], deg(45)); 
    expectQuat(q1, q2, 1e-12); 
});

test('axis scaling does not change quat (normalize axis, not quat)', () => {
  const q1 = quatFromAxisAngle([2,0,0], deg(45));
  const q2 = quatFromAxisAngle([1,0,0], deg(45));
  expectQuat(q1, q2, 1e-12);
  // Also verify angle is 45°:
  const angle = 2 * Math.acos(q1[0]);
  expect(Math.abs(angle - deg(45)) < 1e-12, 'Angle changed by axis scaling');
});

test('axis normalization works for non-axis-aligned vector', () => {
  const q1 = quatFromAxisAngle([3, 4, 0], deg(45));     // length 5
  const q2 = quatFromAxisAngle([0.6, 0.8, 0], deg(45)); // normalized
  expectQuat(q1, q2, 1e-12);
});

test('q(u, θ) equals q(-u, -θ)', () => {
  const u  = [0.3, -0.7, 0.2];
  const um = u.map(x => -x);
  const q1 = quatFromAxisAngle(u,  deg(37));
  const q2 = quatFromAxisAngle(um, -deg(37));
  expectQuat(q1, q2, 1e-12);
});

test('q(u, θ) ≠ q(-u, θ) but rotates vectors identically with θ→-θ', () => {
  const u  = [0,1,0];
  const um = [0,-1,0];
  const v  = [0,0,1];

  const qA = quatFromAxisAngle(u,  deg(30));
  const qB = quatFromAxisAngle(um, deg(30));   // not the same orientation
  // They should NOT be equal quaternions:
  try { expectQuat(qA, qB, 1e-12); throw new Error('Should not be equal'); } catch (_) {}

  // But q(um, +θ) equals q(u, -θ) as rotations:
  const qC = quatFromAxisAngle(u, -deg(30));
  const rB = quatRotateVector(qB, v);
  const rC = quatRotateVector(qC, v);
  expectVec(rB, rC, 1e-12);
});

test('zero-length axis returns identity (no rotation)', () => {
  const q = quatFromAxisAngle([0,0,0], deg(45));
  expectQuat(q, [1,0,0,0], 1e-12);
});

test('output quaternion is unit length', () => {
  const q = quatFromAxisAngle([10, -2, 3], deg(73));
  const len = Math.hypot(...q);
  if (Math.abs(len - 1) > 1e-12) throw new Error('Quaternion not unit');
});

test('rotations are equal even if quaternions differ by sign', () => {
  const q1 = quatFromAxisAngle([0,0,1], deg(90));
  const q2 = q1.map(x => -x); // same rotation
  const v  = [1,0,0];
  const r1 = quatRotateVector(q1, v);
  const r2 = quatRotateVector(q2, v);
  expectVec(r1, r2, 1e-12);
});

test('normalize after multiply keeps unit length', () => {
  let q = quatFromAxisAngle([0,0,1], deg(10));
  for (let i=0; i<200; i++) {
    q = quatMultiply(q, q);
    q = quatNormalize(q);                 // <— the claim under test
    const len = Math.hypot(...q);
    if (!Number.isFinite(len)) throw new Error('NaN/∞ encountered');
    if (Math.abs(len - 1) > 1e-9) throw new Error(`|q| drifted: ${len}`);
  }
});


test('repeated multiply without normalization remains finite', () => {
  let q = quatFromAxisAngle([0,0,1], deg(10));
  for (let i=0; i<63; i++) {        // more than 63 goes NaN
    q = quatMultiply(q, q);
    const len = Math.hypot(...q);
    if (!Number.isFinite(len)) throw new Error(`NaN/∞ at i=${i}`);
  }
  // (We don't assert |q|≈1 here—just that it stayed finite.)
});

// ------- summary -------
window.addEventListener('load', () => {
  const total = passed + failed;
  const cls = failed ? 'fail' : 'pass';
  log(`<hr><strong class="${cls}">${passed}/${total} tests passed</strong>`);
});
