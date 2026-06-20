import type { RoadGraph, RoadSegment } from './RoadGraph';

// Highway/bridge sub-segments (already curved + tagged by RoadGraph) owned
// by this chunk, using the same midpoint-in-AABB ownership rule as the other
// placers so an elevated piece spanning a chunk border is only built once.
export function placeElevatedRoadPieces(
  roadGraph: RoadGraph,
  centerX: number,
  centerZ: number,
  chunkSize: number,
): RoadSegment[] {
  const halfSize = chunkSize / 2;
  const minX = centerX - halfSize;
  const maxX = centerX + halfSize;
  const minZ = centerZ - halfSize;
  const maxZ = centerZ + halfSize;

  return roadGraph.segmentsNear(centerX, centerZ).filter((seg) => {
    if (seg.kind === 'normal') return false;
    const midX = (seg.ax + seg.bx) / 2;
    const midZ = (seg.az + seg.bz) / 2;
    return midX >= minX && midX < maxX && midZ >= minZ && midZ < maxZ;
  });
}
