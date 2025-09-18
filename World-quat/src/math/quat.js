/**
 * Quaternion utilities using [w, x, y, z].
 *
 * House rules:
 * - Functions ending with `p` mutate their first argument in-place and return it, others return a fresh instance.
 * - Non-`p` variants generally allocate by cloning the first argument (via `.slice()`) and
 *   then delegate to the in-place version.
 * - Vectors are [x, y, z]. Angles are radians.
 *
 * This module exposes short names (qmul, qmulp, qnorm, qnormp, ...).
 */

// -------------------------------------------------------------
// Identity
// -------------------------------------------------------------

/**
 * Identity quaternion constant [1,0,0,0].
 * @type {readonly [number, number, number, number]}
 */
export const QI = Object.freeze([1, 0, 0, 0]);

/**
 * Return a fresh identity quaternion.
 * @returns {[number, number, number, number]}
 */
export function qid() {
    return [1, 0, 0, 0];
}

// -------------------------------------------------------------
// Core operations (in-place are primary)
// -------------------------------------------------------------

/**
 * Multiply quaternions in-place: a = a * b (Hamilton product).
 * @param {number[]} a - Left operand; mutated to the product.
 * @param {number[]} b - Right operand.
 * @returns {number[]} The mutated quaternion `a`.
 */
export function qmulp(a, b) {
    const aw = a[0], ax = a[1], ay = a[2], az = a[3];
    const bw = b[0], bx = b[1], by = b[2], bz = b[3];
    a[0] = aw * bw - ax * bx - ay * by - az * bz;
    a[1] = aw * bx + ax * bw + ay * bz - az * by;
    a[2] = aw * by - ax * bz + ay * bw + az * bx;
    a[3] = aw * bz + ax * by - ay * bx + az * bw;
    return a;
}

/**
 * Multiply quaternions (allocating): returns a * b.
 * @param {number[]} a - Left operand.
 * @param {number[]} b - Right operand.
 * @returns {number[]} New quaternion equal to a * b.
 */
export function qmul(a, b) {
    return qmulp(a.slice(), b);
}

/**
 * Conjugate in-place: a = [w, -x, -y, -z].
 * @param {number[]} a - Quaternion; mutated.
 * @returns {number[]} The mutated quaternion `a`.
 */
export function qconjp(a) {
    a[1] = -a[1];
    a[2] = -a[2];
    a[3] = -a[3];
    return a;
}

/**
 * Conjugate (allocating).
 * @param {number[]} a - Input quaternion.
 * @returns {number[]} Conjugated quaternion.
 */
export function qconj(a) {
    return qconjp(a.slice());
}

/**
 * Normalize in-place to unit length.
 * If the quaternion has zero length, it is left unchanged.
 * @param {number[]} q - Quaternion; mutated.
 * @returns {number[]} The mutated quaternion `q`.
 */
export function qnormp(q) {
    const n2 = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
    if (n2 === 0) return q;
    const inv = 1 / Math.sqrt(n2);
    q[0] *= inv; q[1] *= inv; q[2] *= inv; q[3] *= inv;
    return q;
}

/**
 * Normalize (allocating).
 * @param {number[]} q - Input quaternion.
 * @returns {number[]} Unit-length quaternion (or a copy if zero-length).
 */
export function qnorm(q) {
    return qnormp(q.slice());
}

/**
 * Normalize in-place and ensure w >= 0 (choose positive-hemisphere rep).
 * Zero quaternion becomes identity.
 * @param {number[]} q - Quaternion; mutated.
 * @returns {number[]} The mutated quaternion `q`.
 */
export function qnormposp(q) {
    const n2 = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
    if (n2 === 0) {
        q[0] = 1; q[1] = 0; q[2] = 0; q[3] = 0;
        return q;
    }
    const inv = (q[0] >= 0 ? 1 : -1) / Math.sqrt(n2);
    q[0] *= inv; q[1] *= inv; q[2] *= inv; q[3] *= inv;
    return q;
}

/**
 * Normalize and ensure w >= 0 (allocating).
 * @param {number[]} q - Input quaternion.
 * @returns {number[]} Unit quaternion with non-negative w.
 */
export function qnormpos(q) {
    return qnormposp(q.slice());
}

/**
 * Invert in-place: q = q^{-1}. If zero-length, leaves `q` unchanged.
 * @param {number[]} q - Quaternion; mutated.
 * @returns {number[]} The mutated quaternion `q`.
 */
export function qinvp(q) {
    const n2 = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
    if (n2 === 0) return q;
    // conj / n2
    q[1] = -q[1]; q[2] = -q[2]; q[3] = -q[3];
    const inv = 1 / n2 ;
    q[0] *= inv; q[1] *= inv; q[2] *= inv; q[3] *= inv;
    return q;
}

/**
 * Invert (allocating).
 * @param {number[]} q - Input quaternion.
 * @returns {number[]} Inverse quaternion.
 */
export function qinv(q) {
    return qinvp(q.slice());
}

// -------------------------------------------------------------
// Construction & conversion
// -------------------------------------------------------------

/**
 * Create quaternion from axis (vec3) and angle (radians).
 * @param {number[]} axis - [x,y,z] rotation axis.
 * @param {number} angle - Rotation angle in radians.
 * @returns {number[]} Quaternion [w,x,y,z].
 */
export function qaxis(axis, angle) {
    const ax = axis[0], ay = axis[1], az = axis[2];
    const len = Math.hypot(ax, ay, az) || 1;
    const nx = ax / len, ny = ay / len, nz = az / len;
    const s = Math.sin(angle / 2), c = Math.cos(angle / 2);
    return [c, nx * s, ny * s, nz * s];
}

/**
 * Convert quaternion to a 3x3 rotation matrix (row-major), in-place on m.
 * @param {number[][]} m - 3x3 matrix (array of 3 row arrays); mutated/set.
 * @param {number[]} q - Quaternion [w,x,y,z].
 * @returns {number[][]} The mutated matrix `m`.
 */
export function qmatp(m, q) {
    const w = q[0], x = q[1], y = q[2], z = q[3];
    const xx = x * x, yy = y * y, zz = z * z;
    const wx = w * x, wy = w * y, wz = w * z;
    const xy = x * y, xz = x * z, yz = y * z;
    m[0][0] = 1 - 2 * (yy + zz);
    m[0][1] = 2 * (xy - wz);
    m[0][2] = 2 * (xz + wy);
    m[1][0] = 2 * (xy + wz);
    m[1][1] = 1 - 2 * (xx + zz);
    m[1][2] = 2 * (yz - wx);
    m[2][0] = 2 * (xz - wy);
    m[2][1] = 2 * (yz + wx);
    m[2][2] = 1 - 2 * (xx + yy);
    return m;
}

/**
 * Convert quaternion to a 3x3 rotation matrix (allocating).
 * @param {number[]} q - Quaternion [w,x,y,z].
 * @returns {number[][]} New 3x3 rotation matrix (array of row arrays).
 */
export function qmat(q) {
    const m = [ [0,0,0], [0,0,0], [0,0,0] ];
    return qmatp(m, q);
}

/**
 * Normalized linear interpolation between two quaternions (shortest-path),
 * then clamped to the positive hemisphere (w >= 0).
 * out = nlerp(qa -> qb, t), t in [0,1].
 * Uses the "flip if dot < 0" trick to ensure shortest path.
 * @param {number[]} qa - Start quaternion [w,x,y,z].
 * @param {number[]} qb - End quaternion [w,x,y,z].
 * @param {number} t    - Blend factor in [0,1].
 * @param {number[]} [out] - Optional out quaternion; allocated if omitted.
 * @returns {number[]} The interpolated, unit quaternion with w >= 0.
 */
export function qnlerp(qa, qb, t, out = [0, 0, 0, 0]) {
    // Shortest-path: flip qb if needed.
    let bw = qb[0], bx = qb[1], by = qb[2], bz = qb[3];
    if ((qa[0] * bw + qa[1] * bx + qa[2] * by + qa[3] * bz) < 0) {
        bw = -bw; bx = -bx; by = -by; bz = -bz;
    }
    // Linear blend
    out[0] = qa[0] + (bw - qa[0]) * t;
    out[1] = qa[1] + (bx - qa[1]) * t;
    out[2] = qa[2] + (by - qa[2]) * t;
    out[3] = qa[3] + (bz - qa[3]) * t;
    // Normalize + clamp to positive hemisphere using existing util
    return qnormposp(out);
}
