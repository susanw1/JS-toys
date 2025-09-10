export const EPS = 1e-9;
export const approx = (a, b, e = EPS) => Math.abs(a - b) <= e;

export const vecApprox = (a, b, e = EPS) =>
    approx(a[0], b[0], e) && approx(a[1], b[1], e) && approx(a[2], b[2], e);

export const quatApprox = (a, b, e = EPS) => {
    // compare up to sign
    const direct = vecApprox(a.slice(1), b.slice(1), e) && approx(a[0], b[0], e);
    if (direct) return true;
    return vecApprox(a.slice(1).map(x => -x), b.slice(1), e) && approx(-a[0], b[0], e);
};
