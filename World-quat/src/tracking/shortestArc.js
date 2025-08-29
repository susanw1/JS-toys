import { vcross, vlen, vdot, vnorm, clampUnit } from "../math/vec3.js";
import { quatFromAxisAngle, quatMultiply, quatNormalize, quatRotateVector } from "../math/quat.js";

export function shortestArcStep(currentQuat, fromDirLocal, toDirWorld, maxStepRad, worldUp = [0, 1, 0], rollRate = 0) {
    const fCur = quatRotateVector(currentQuat, fromDirLocal);
    const fDes = vnorm(toDirWorld);

    let axis = vcross(fCur, fDes);
    const s = vlen(axis);
    const c = clampUnit(vdot(fCur, fDes));
    const ang = Math.atan2(s, c);
    axis = s > 1e-9 ? [axis[0] / s, axis[1] / s, axis[2] / s] : [0, 0, 0];

    let q = currentQuat;
    const step = Math.min(ang, maxStepRad);
    if (step > 1e-6 && s > 1e-9) {
        q = quatMultiply(quatFromAxisAngle(axis, step), q);
    }

    if (rollRate > 0) {
        const fNow = quatRotateVector(q, fromDirLocal);
        const dotUF = vdot(worldUp, fNow);
        const upProj = vnorm([
            worldUp[0] - dotUF * fNow[0],
            worldUp[1] - dotUF * fNow[1],
            worldUp[2] - dotUF * fNow[2]
        ]);
        const rNow = quatRotateVector(q, [1, 0, 0]);
        const uNow = vcross(fNow, rNow);

        let ax = vcross(uNow, upProj);
        const s2 = vlen(ax);
        const c2 = clampUnit(vdot(uNow, upProj));
        let rollErr = Math.atan2(s2, c2);

        if (s2 > 1e-9) {
            ax = [ax[0] / s2, ax[1] / s2, ax[2] / s2];
            if (vdot(ax, fNow) < 0) {
                rollErr = -rollErr;
            }
            const rollStep = Math.sign(rollErr) * Math.min(Math.abs(rollErr), rollRate);
            if (Math.abs(rollStep) > 1e-6) {
                q = quatMultiply(quatFromAxisAngle(fNow, rollStep), q);
            }
        }
    }

    return quatNormalize(q);
}
