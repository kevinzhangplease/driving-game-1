import type { RoadGraph } from '../roads/RoadGraph';

export interface SignInstance {
  x: number;
  z: number;
}

const SIGN_OFFSET = 6;

// One cosmetic sign post near each road intersection node, offset diagonally
// so it doesn't sit on the flattened road surface. Only the chunk whose AABB
// contains the node's position renders it.
export function placeSigns(
  roadGraph: RoadGraph,
  centerX: number,
  centerZ: number,
  chunkSize: number,
): SignInstance[] {
  const halfSize = chunkSize / 2;
  const minX = centerX - halfSize;
  const maxX = centerX + halfSize;
  const minZ = centerZ - halfSize;
  const maxZ = centerZ + halfSize;

  const result: SignInstance[] = [];
  for (const node of roadGraph.nodesNear(centerX, centerZ)) {
    const x = node.x + SIGN_OFFSET;
    const z = node.z + SIGN_OFFSET;
    if (x < minX || x >= maxX || z < minZ || z >= maxZ) continue;
    result.push({ x, z });
  }
  return result;
}
