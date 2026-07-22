import type { Wall, Point, CleanWallEndpoints } from "@/types/editor";

export function wallLengthMeters(wall: Wall, gridSize: number): number {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  return Math.sqrt(dx * dx + dy * dy) / gridSize;
}

export function wallLengthFromMeters(
  x1: number, y1: number, x2: number, y2: number, newLenM: number, gridSize: number
): { x2: number; y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const curLen = Math.sqrt(dx * dx + dy * dy);
  if (curLen < 1) return { x2, y2 };
  const ratio = (newLenM * gridSize) / curLen;
  return { x2: x1 + dx * ratio, y2: y1 + dy * ratio };
}

export function openingPositionOnWall(
  wall: Wall, clickX: number, clickY: number
): number {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1) return 0;
  const t = ((clickX - wall.x1) * dx + (clickY - wall.y1) * dy) / len2;
  return Math.max(0, Math.min(1, t));
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const dot = apx * abx + apy * aby;
  const len2 = abx * abx + aby * aby;
  let t = len2 !== 0 ? dot / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return distance(p, { x: a.x + t * abx, y: a.y + t * aby });
}

export function projectPointOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1) return { x: a.x, y: a.y };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

export function isPointOnSegment(p: Point, a: Point, b: Point, threshold: number): boolean {
  return pointToSegmentDistance(p, a, b) <= threshold;
}

export function computeCleanEndpoints(walls: Wall[]): Map<string, CleanWallEndpoints> {
  const result = new Map<string, CleanWallEndpoints>();
  const threshold = 12;

  for (const wall of walls) {
    let x1 = wall.x1, y1 = wall.y1;
    let x2 = wall.x2, y2 = wall.y2;

    for (const other of walls) {
      if (other.id === wall.id) continue;
      const oa: Point = { x: other.x1, y: other.y1 };
      const ob: Point = { x: other.x2, y: other.y2 };

      const s: Point = { x: wall.x1, y: wall.y1 };
      const e: Point = { x: wall.x2, y: wall.y2 };

      if (isPointOnSegment(s, oa, ob, threshold)) {
        const proj = projectPointOnSegment(s, oa, ob);
        x1 = proj.x;
        y1 = proj.y;
      }
      if (isPointOnSegment(e, oa, ob, threshold)) {
        const proj = projectPointOnSegment(e, oa, ob);
        x2 = proj.x;
        y2 = proj.y;
      }
    }

    result.set(wall.id, { x1, y1, x2, y2 });
  }

  return result;
}

export function wallOffsetPoints(
  x1: number, y1: number, x2: number, y2: number, offset: number
): { nx: number; ny: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return { nx: 0, ny: 0 };
  return { nx: (-dy / len) * offset, ny: (dx / len) * offset };
}

export function segmentIntersection(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
  const dax = a2.x - a1.x;
  const day = a2.y - a1.y;
  const dbx = b2.x - b1.x;
  const dby = b2.y - b1.y;
  const denom = dax * dby - day * dbx;
  if (Math.abs(denom) < 0.001) return null;
  const t = ((b1.x - a1.x) * dby - (b1.y - a1.y) * dbx) / denom;
  const u = ((b1.x - a1.x) * day - (b1.y - a1.y) * dax) / denom;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: a1.x + t * dax, y: a1.y + t * day };
  }
  return null;
}

export function getWallMidpoint(wall: Wall): Point {
  return { x: (wall.x1 + wall.x2) / 2, y: (wall.y1 + wall.y2) / 2 };
}

export function angleBetweenPoints(center: Point, a: Point, b: Point): number {
  const angleA = Math.atan2(a.y - center.y, a.x - center.x);
  const angleB = Math.atan2(b.y - center.y, b.x - center.x);
  let diff = angleB - angleA;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return Math.abs(diff);
}

export function polygonArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

export function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}
