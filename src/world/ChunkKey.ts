export interface ChunkCoord {
  cx: number;
  cz: number;
}

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function parseChunkKey(key: string): ChunkCoord {
  const [cx, cz] = key.split(',').map(Number);
  return { cx: cx!, cz: cz! };
}

export function worldToChunkCoord(worldX: number, worldZ: number, chunkSize: number): ChunkCoord {
  return {
    cx: Math.floor(worldX / chunkSize),
    cz: Math.floor(worldZ / chunkSize),
  };
}
