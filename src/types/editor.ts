export type Tool =
  | "select" | "wall" | "room" | "column"
  | "door" | "sliding_door" | "window"
  | "label" | "measure" | "rotate" | "eraser"
  | "mirror" | "trim" | "offset" | "fill";

export type WallType = "exterior" | "interior";
export type OpeningType = "door" | "sliding_door" | "window";
export type WallAlignment = "center" | "outer" | "inner";
export type ColumnAlignMode = "none" | "center" | "outer_edge" | "corner";
export type FloorFillType = "tile" | "parquet" | "concrete";

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  height: number;
  wallType: WallType;
}

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  position: number;
  width: number;
  height: number;
  sillHeight: number;
}

export interface Column {
  id: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
}

export interface FloorLabel {
  id: string;
  x: number;
  y: number;
  text: string;
  rotation: number;
}

export interface MeasureLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface FloorFill {
  id: string;
  points: Point[];
  fillType: FloorFillType;
}

export interface FurnitureItem {
  id: string;
  name: string;
  category: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  elevation: number;
}

export interface FurnitureTemplate {
  name: string;
  width: number;
  height: number;
}

export interface CleanWallEndpoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

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

export const FURNITURE_CATALOG: Record<string, FurnitureTemplate[]> = {
  "Living Room": [
    { name: "L-Shape Sofa", width: 2.5, height: 1.8 },
    { name: "Armchair", width: 0.9, height: 0.9 },
    { name: "Coffee Table", width: 1.2, height: 0.6 },
    { name: "TV Console", width: 1.8, height: 0.5 },
    { name: "Bookshelf", width: 0.8, height: 0.4 },
  ],
  "Bedroom": [
    { name: "King Bed", width: 2.0, height: 2.0 },
    { name: "Queen Bed", width: 1.6, height: 2.0 },
    { name: "Single Bed", width: 1.0, height: 2.0 },
    { name: "Wardrobe", width: 1.5, height: 0.6 },
    { name: "Nightstand", width: 0.5, height: 0.5 },
  ],
  "Kitchen": [
    { name: "L-Counter", width: 2.0, height: 1.5 },
    { name: "Kitchen Island", width: 1.8, height: 0.9 },
    { name: "Fridge", width: 0.8, height: 0.8 },
    { name: "Gas Stove", width: 0.9, height: 0.6 },
    { name: "Dining Table 6-Chair", width: 1.8, height: 0.9 },
  ],
  "Bathroom": [
    { name: "Bathtub", width: 1.7, height: 0.75 },
    { name: "Shower Cabin", width: 1.0, height: 1.0 },
    { name: "Toilet", width: 0.5, height: 0.7 },
    { name: "Vanity Sink", width: 1.0, height: 0.5 },
  ],
  "Architectural": [
    { name: "Straight Stairs", width: 3.0, height: 1.0 },
    { name: "L-Shape Stairs", width: 2.5, height: 2.5 },
    { name: "Car Garage", width: 3.0, height: 6.0 },
  ],
};

export function getDefaultThickness(wallType: WallType): number {
  return wallType === "exterior" ? 0.3 : 0.15;
}

export interface EditorState {
  activeTool: Tool;
  gridVisible: boolean;
  snapSize: number;
  wallAlignment: WallAlignment;
  columnAlignMode: ColumnAlignMode;
  walls: Wall[];
  openings: Opening[];
  columns: Column[];
  labels: FloorLabel[];
  measureLines: MeasureLine[];
  floorFills: FloorFill[];
  furniture: FurnitureItem[];
  selectedWallId: string | null;
  selectedOpeningId: string | null;
  selectedColumnId: string | null;
  selectedLabelId: string | null;
  selectedFurnitureId: string | null;
  history: Wall[][];
  historyIndex: number;
  landWidth: number;
  landLength: number;
  wallHeight: number;
  wallType: WallType;
  wireframeMode: boolean;
  is3DFullscreen: boolean;
  catalogVisible: boolean;
  activeFurnitureTemplate: FurnitureTemplate | null;
  offsetDistance: number;
}

export interface EditorActions {
  setActiveTool: (tool: Tool) => void;
  toggleGrid: () => void;
  setSnapSize: (size: number) => void;
  setWallAlignment: (align: WallAlignment) => void;
  setColumnAlignMode: (mode: ColumnAlignMode) => void;
  setOffsetDistance: (dist: number) => void;
  addWall: (wall: Wall) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  deleteWall: (id: string) => void;
  selectWall: (id: string | null) => void;
  addOpening: (opening: Opening) => void;
  updateOpening: (id: string, updates: Partial<Opening>) => void;
  deleteOpening: (id: string) => void;
  selectOpening: (id: string | null) => void;
  addColumn: (column: Column) => void;
  updateColumn: (id: string, updates: Partial<Column>) => void;
  deleteColumn: (id: string) => void;
  selectColumn: (id: string | null) => void;
  addLabel: (label: FloorLabel) => void;
  updateLabel: (id: string, updates: Partial<FloorLabel>) => void;
  deleteLabel: (id: string) => void;
  selectLabel: (id: string | null) => void;
  addMeasureLine: (line: MeasureLine) => void;
  clearMeasureLines: () => void;
  addFloorFill: (fill: FloorFill) => void;
  updateFloorFill: (id: string, updates: Partial<FloorFill>) => void;
  deleteFloorFill: (id: string) => void;
  addFurniture: (item: FurnitureItem) => void;
  updateFurniture: (id: string, updates: Partial<FurnitureItem>) => void;
  deleteFurniture: (id: string) => void;
  selectFurniture: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  clearSelection: () => void;
  setLandWidth: (width: number) => void;
  setLandLength: (length: number) => void;
  setWallHeight: (height: number) => void;
  setWallType: (type: WallType) => void;
  setWireframeMode: (mode: boolean) => void;
  setIs3DFullscreen: (fullscreen: boolean) => void;
  setCatalogVisible: (visible: boolean) => void;
  setActiveFurnitureTemplate: (template: FurnitureTemplate | null) => void;
}
