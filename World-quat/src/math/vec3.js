export function clampUnit(x) {
    return Math.max(-1, Math.min(1, x));
}

export function vadd(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vsub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vscale(a, s) {
    return [a[0] * s, a[1] * s, a[2] * s];
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
