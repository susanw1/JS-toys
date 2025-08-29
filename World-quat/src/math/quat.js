export function quatIdentity() {
    return [1, 0, 0, 0];
}

export function quatNormalize(q) {
    const len = Math.hypot(...q);
    return q.map(v => v / len);
}

export function quatMultiply(a, b) {
    const [aw, ax, ay, az] = a;
    const [bw, bx, by, bz] = b;
    return [
        aw * bw - ax * bx - ay * by - az * bz,
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw
    ];
}

export function quatFromAxisAngle(axis, angle) {
    let [x, y, z] = axis;
    const len = Math.hypot(x, y, z);
    if (len === 0) {
        return [1, 0, 0, 0];
    }
    x /= len;
    y /= len;
    z /= len;

    const half = angle / 2;
    const s = Math.sin(half);
    return [Math.cos(half), x * s, y * s, z * s];
}

// Rotate vector v by quaternion q using q * v * q*
export function quatRotateVector(q, v) {
    const [w, x, y, z] = q;
    const [vx, vy, vz] = v;

    const uvx = 2 * (y * vz - z * vy);
    const uvy = 2 * (z * vx - x * vz);
    const uvz = 2 * (x * vy - y * vx);

    const uuvx = y * uvz - z * uvy;
    const uuvy = z * uvx - x * uvz;
    const uuvz = x * uvy - y * uvx;

    return [
        vx + w * uvx + uuvx,
        vy + w * uvy + uuvy,
        vz + w * uvz + uuvz
    ];
}

export function quatConjugate(q) {
    return [q[0], -q[1], -q[2], -q[3]];
}

export function quatToMatrix(q) {
    let [w, x, y, z] = q;
    const s2 = w * w  +  x * x  +  y * y  +  z * z;
    if (Math.abs(1 - s2) > 1e-6) {
        const inv = 1 / Math.sqrt(s2);
        w *= inv;
        x *= inv;
        y *= inv;
        z *= inv;
    }
    return [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w),     2 * (x * z + y * w)],
        [2 * (x * y + z * w),     1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w),     2 * (y * z + x * w),     1 - 2 * (x * x + y * y)]
    ];
}
