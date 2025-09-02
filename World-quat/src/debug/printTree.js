// Pretty-print the entity/asset tree to the console.
// Works with both Entities and Assets (recurses mounts).
//
// Usage:
//   import { printTree } from "./debug/printTree.js";
//   printTree(cube, { showCaps: true, showIds: true });
//
// Options:
//   log:       (fn) logger to use (default console.log)
//   showCaps:  (bool) include capabilities like [cameraFeed, weapon]
//   showIds:   (bool) include ids in labels
//   maxDepth:  (int)  safety limit (default 32)

export function printTree(host, opts = {}) {
    const log       = opts.log || console.log;
    const showCaps  = !!opts.showCaps;
    const showIds   = !!opts.showIds;
    const maxDepth  = Number.isFinite(opts.maxDepth) ? opts.maxDepth : 32;

    const rootLabel = labelFor(host, { showIds, isRoot: true, showCaps: false });
    log(rootLabel);
    walk(host, "", true, 0);

    function walk(node, prefix, isLast, depth) {
        if (depth >= maxDepth) {
            log(prefix + "└─ (max depth reached)");
            return;
        }

        const mounts = node && node.mounts ? node.mounts : {};
        const entries = Object.keys(mounts);

        entries.forEach((mId, idx) => {
            const last = (idx === entries.length - 1);
            const a = mounts[mId].asset;
            const branch = last ? "└─ " : "├─ ";
            const nextPrefix = prefix + (last ? "   " : "│  ");
            const mountLabel = `(${mId})`;

            if (!a) {
                log(prefix + branch + mountLabel + " <empty>");
                return;
            }

            const assetLabel = labelFor(a, { showIds, showCaps });
            log(prefix + branch + mountLabel + " " + assetLabel);
            walk(a, nextPrefix, last, depth + 1);
        });
    }
}

function labelFor(node, { showIds, isRoot = false, showCaps = false }) {
    if (isEntity(node)) {
        const k = node.kind || "entity";
        const idPart = showIds ? ` id=${safeId(node)}` : "";
        const p = node.position || [0, 0, 0];
        return `Entity<${k}>${idPart} pos=[${num(p[0])}, ${num(p[1])}, ${num(p[2])}]`;
    } else {
        // Asset
        const k = node.kind || "asset";
        const idPart = showIds ? ` id=${safeId(node)}` : "";
        const namePart = node.name ? ` "${node.name}"` : "";
        let capPart = "";
        if (showCaps && typeof node.getCapabilities === "function") {
            const caps = node.getCapabilities() || {};
            const keys = Object.keys(caps).filter(c => !!caps[c]);
            if (keys.length) {
                capPart = " [" + keys.join(", ") + "]";
            }
        }
        return `Asset<${k}>${namePart}${idPart}${capPart}`;
    }
}

function isEntity(x) {
    // A minimal heuristic: entities have position+rotation arrays and may have .root
    return !!(x && Array.isArray(x.position) && Array.isArray(x.rotation));
}

function safeId(x) {
    return (x && (x.id || x.kind)) || "?";
}

function num(v) {
    return Math.abs(v) < 1e-6 ? 0 : Number(v.toFixed(3));
}
