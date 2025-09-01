import { quatMultiply, quatRotateVector, quatNormalizePositive } from "./quat.js";

export function makeTransform(pos = [0, 0, 0], rot = [1, 0, 0, 0]) {
    return { pos: pos.slice(0, 3), rot: rot.slice(0, 4) };
}

// parent ∘ local
export function composeTransform(parent, local) {
    const rot = quatNormalizePositive(quatMultiply(parent.rot, local.rot));
    const off = quatRotateVector(parent.rot, local.pos);
    return {
        pos: [parent.pos[0] + off[0], parent.pos[1] + off[1], parent.pos[2] + off[2]],
        rot
    };
}

// Transform a local point to world using T = { pos, rot }
export function transformPoint(T, vLocal) {
    const r = quatRotateVector(T.rot, vLocal);
    return [r[0] + T.pos[0], r[1] + T.pos[1], r[2] + T.pos[2]];
}
