/**
 * Conventions:
 * - Functions ending with `p` mutate their first argument in-place.
 * - Functions without `p` return a new vec3 and delegate to the in-place version
 *   after cloning the first argument.
 */

/**
 * Clamp a number to the [-1, 1] interval.
 * @param {number} x - Input value.
 * @returns {number} Value clamped to [-1, 1].
 */
export function clampUnit(x) {
    return clamp(x, -1, 1);
}

/**
 * Clamp a number to the [a, b] interval.
 * Note: Assumes `a` is the lower bound and `b` is the upper bound.
 * @param {number} x - Input value.
 * @param {number} a - Lower bound.
 * @param {number} b - Upper bound.
 * @returns {number} Value clamped to [a, b].
 */
export function clamp(x, a, b) {
    return (x < a) ? a : (x > b) ? b : x;
}

/**
 * Set a vec3 to all zeros, in-place.
 * @param {number[]} v - Vector [x, y, z]; mutated.
 * @returns {void}
 */
export function vzerop(v) {
    v[0] = v[1] = v[2] = 0;
}

/**
 * Add two vec3s, returning a new vec3.
 * @param {number[]} a - Left-hand vector [x, y, z].
 * @param {number[]} b - Right-hand vector [x, y, z].
 * @returns {number[]} New vector a + b.
 */
export function vadd(a, b) {
    return vaddp(a.slice(), b);
}

/**
 * Add vec3 b into vec3 a, in-place.
 * @param {number[]} a - Vector to accumulate into [x, y, z]; mutated.
 * @param {number[]} b - Vector to add [x, y, z].
 * @returns {number[]} The mutated vector `a`.
 */
export function vaddp(a, b) {
    a[0] += b[0];
    a[1] += b[1];
    a[2] += b[2];
    return a;
}

/**
 * Subtract two vec3s, returning a new vec3 (a - b).
 * @param {number[]} a - Minuend [x, y, z].
 * @param {number[]} b - Subtrahend [x, y, z].
 * @returns {number[]} New vector a - b.
 */
export function vsub(a, b) {
    return vsubp(a.slice(), b);
}

/**
 * Subtract vec3 b from vec3 a, in-place (a -= b).
 * @param {number[]} a - Vector to subtract from [x, y, z]; mutated.
 * @param {number[]} b - Vector to subtract [x, y, z].
 * @returns {number[]} The mutated vector `a`.
 */
export function vsubp(a, b) {
    a[0] -= b[0];
    a[1] -= b[1];
    a[2] -= b[2];
    return a;
}

/**
 * Multiply a vec3 by a scalar, returning a new vec3.
 * @param {number[]} a - Input vector [x, y, z].
 * @param {number} s - Scalar.
 * @returns {number[]} New vector a * s.
 */
export function vscale(a, s) {
    return vscalep(a.slice(), s);
}

/**
 * Multiply a vec3 by a scalar in-place.
 * @param {number[]} a - Vector to scale [x, y, z]; mutated.
 * @param {number} s - Scalar.
 * @returns {number[]} The mutated vector `a`.
 */
export function vscalep(a, s) {
    a[0] *= s;
    a[1] *= s;
    a[2] *= s;
    return a;
}

/**
 * Dot product of two vec3s.
 * @param {number[]} a - First vector [x, y, z].
 * @param {number[]} b - Second vector [x, y, z].
 * @returns {number} Dot product a · b.
 */
export function vdot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Euclidean length (magnitude) of a vec3.
 * @param {number[]} a - Input vector [x, y, z].
 * @returns {number} ||a||.
 */
export function vlen(a) {
    return Math.hypot(a[0], a[1], a[2]);
}

/**
 * Normalize a vec3, returning a new vector.
 * If the input has zero length, a cloned copy is returned unchanged.
 * @param {number[]} a - Input vector [x, y, z].
 * @returns {number[]} New unit-length vector (or a copy if length is 0).
 */
 export function vnorm(a) {
    return vnormp(a.slice());
}

/**
 * Normalize a vec3 in-place.
 * If the vector has zero length, it is left unchanged (treated as length 1).
 * @param {number[]} a - Vector to normalize [x, y, z]; mutated.
 * @returns {number[]} The mutated vector `a`.
 */
export function vnormp(a) {
    const L = vlen(a) || 1;
    return vscalep(a, 1 / L);
}

/**
 * Cross product of two vec3s, returning a new vec3 (a × b).
 * @param {number[]} a - Left-hand vector [x, y, z].
 * @param {number[]} b - Right-hand vector [x, y, z].
 * @returns {number[]} New vector a × b.
 */
export function vcross(a, b) {
    return vcrossp(a.slice(), b);
}

/**
 * Cross product of two vec3s, in-place on `a` (a = a × b).
 * @param {number[]} a - Vector to overwrite with the cross product; mutated.
 * @param {number[]} b - Right-hand vector [x, y, z].
 * @returns {number[]} The mutated vector `a` containing `a × b`.
 */
export function vcrossp(a, b) {
    const a0 = a[1] * b[2] - a[2] * b[1];
    const a1 = a[2] * b[0] - a[0] * b[2];
    const a2 = a[0] * b[1] - a[1] * b[0];
    a[0] = a0;
    a[1] = a1;
    a[2] = a2;
    return a;
}
