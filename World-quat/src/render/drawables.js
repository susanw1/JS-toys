// Collect { mesh, transform:{pos,rot} } for entities and their fitted assets.
export function collectDrawables(entities) {
    const out = [];
    for (const e of entities) {
        for (const mId in (e.mounts || {})) {
            const a = e.mounts[mId].asset;
            if (a && a.mesh) {
                out.push({ mesh: a.mesh, transform: a.worldTransform() });
            }
        }
    }
    return out;
}
