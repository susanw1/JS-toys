import { qmul, qnormpos } from "./quat.js";
import { vqrot } from "./vec3.js";

/**
 * Create a transform object from position and rotation inputs.
 *
 * A transform is an object:
 *   { pos: [x, y, z], rot: [w, x, y, z] }
 * where `pos` is a translation vector and `rot` is a unit quaternion.
 *
 * Both `pos` and `rot` are **cloned** (sliced) so the returned transform does not
 * alias the input arrays.
 *
 * @param {number[]} [pos=[0,0,0]] - Position vector [x,y,z].
 * @param {number[]} [rot=[1,0,0,0]] - Quaternion rotation [w,x,y,z].
 * @returns {{ pos: number[], rot: number[] }} A new transform with cloned fields.
 */
export function makeTransform(pos = [0, 0, 0], rot = [1, 0, 0, 0]) {
    return { pos: pos.slice(0, 3), rot: rot.slice(0, 4) };
}

/**
 * Compose two transforms using parent ∘ local.
 *
 * Given parent transform P = {pos_p, rot_p} and local transform L = {pos_l, rot_l},
 * the composed transform C = P ∘ L is:
 *   rot_c = qnormpos(qmul(rot_p, rot_l))
 *   pos_c = pos_p + qrot(rot_p, pos_l)
 *
 * Notes:
 * - `qnormpos` ensures the resulting quaternion has non-negative w and unit length
 *   (positive-hemisphere representative), which is useful for stable interpolation.
 * - This function **allocates** new arrays for the returned transform fields.
 *
 * @param {{ pos: number[], rot: number[] }} parent - Parent/world transform.
 * @param {{ pos: number[], rot: number[] }} local - Child/local transform.
 * @returns {{ pos: number[], rot: number[] }} Composed transform (new object).
 */
export function composeTransform(parent, local) {
    const rot = qnormpos(qmul(parent.rot, local.rot));
    const off = vqrot(local.pos, parent.rot);
    return {
        pos: [parent.pos[0] + off[0], parent.pos[1] + off[1], parent.pos[2] + off[2]],
        rot
    };
}

/**
 * Transform a point from local space to world space using T = { pos, rot }.
 *
 * The transformed point is:
 *   world = qrot(T.rot, vLocal) + T.pos
 *
 * This function **allocates** a new vector for the result.
 *
 * @param {{ pos: number[], rot: number[] }} T - Transform with position and quaternion.
 * @param {number[]} vLocal - Local-space vector [x,y,z].
 * @returns {number[]} World-space vector [x,y,z].
 */
export function transformPoint(T, vLocal) {
    const r = vqrot(vLocal, T.rot);
    return [r[0] + T.pos[0], r[1] + T.pos[1], r[2] + T.pos[2]];
}
