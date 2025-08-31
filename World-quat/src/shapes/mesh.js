// Generic mesh shape: vertices, edges, and simple bounds (AABB + sphere)
export class MeshShape {
    constructor(vertices, edges) {
        this.vertices = vertices.map(v => v.slice(0, 3));
        this.edges = edges.map(list => list.slice());
        this.bounds = computeBounds(this.vertices);
    }
}

function computeBounds(verts) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const [x, y, z] of verts) {
        if (x < minX) { minX = x; }
        if (y < minY) { minY = y; }
        if (z < minZ) { minZ = z; }
        if (x > maxX) { maxX = x; }
        if (y > maxY) { maxY = y; }
        if (z > maxZ) { maxZ = z; }
    }

    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    let r = 0;
    for (const [x, y, z] of verts) {
        const dx = x - cx, dy = y - cy, dz = z - cz;
        r = Math.max(r, Math.hypot(dx, dy, dz));
    }

    return {
        aabb: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
        sphere: { center: [cx, cy, cz], radius: r }
    };
}
