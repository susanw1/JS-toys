import { composeTransform } from "../math/transform.js";

export class AssetFollowerSystem {
    constructor(leaderAsset, followerAsset, offsetTransform) {
        this.leader = leaderAsset;
        this.follower = followerAsset;
        this.offset = offsetTransform; // { pos, rot }
    }

    step(dt) {
        if (!this.leader || !this.follower) {
            return;
        }
        const T = composeTransform(this.leader.local, this.offset);
        this.follower.local.pos = [T.pos[0], T.pos[1], T.pos[2]];
        this.follower.local.rot = [T.rot[0], T.rot[1], T.rot[2], T.rot[3]];
    }
}
