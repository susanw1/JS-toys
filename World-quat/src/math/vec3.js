export function clampUnit(x) {
    return clamp(x, -1, 1);
}

export function clamp(x, a, b) {
    return (x < a) ? a : (a > b) ? b : x;
}

export function vzerop(v) {
    v[0] = v[1] = v[2] = 0;
}

export function vadd(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vaddp(a, b) {
    a[0] += b[0];
    a[1] += b[1];
    a[2] += b[2];
    return a;
}

export function vsub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vsubp(a, b) {
    a[0] -= b[0];
    a[1] -= b[1];
    a[2] -= b[2];
    return a;
}

export function vscale(a, s) {
    return [a[0] * s, a[1] * s, a[2] * s];
}

export function vscalep(a, s) {
    a[0] *= s;
    a[1] *= s;
    a[2] *= s;
    return a;
}

export function vdot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vlen(a) {
    return Math.hypot(a[0], a[1], a[2]);
}

export function vnorm(a) {
    const L = vlen(a) || 1;
    return [a[0] / L, a[1] / L, a[2] / L];
}

export function vcross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

export function vcrossp(a, b) {
    const a0 = a[1] * b[2] - a[2] * b[1];
    const a1 = a[2] * b[0] - a[0] * b[2];
    const a2 = a[0] * b[1] - a[1] * b[0];
    a[0] = a0; a[1] = a1; a[2] = a2;
    return al
}
