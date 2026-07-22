"use client";

export type Tool =
  | "select" | "move_pan" | "rotate" | "trim" | "extend" | "offset" | "split" | "mirror" | "eraser"
  | "wall_single" | "wall_polyline" | "wall_arc" | "room_rectangle"
  | "column_square" | "column_circular" | "curtain_wall" | "slab_floor"
  | "door_single" | "door_double" | "door_sliding" | "window_standard" | "window_corner" | "wall_opening"
  | "dimension_linear" | "dimension_angle" | "area_inspector" | "text_annotation" | "leader_arrow"
  | "tape_measure" | "color_fill" | "layer_toggle" | "grid_config";

export type ToolCategory = "drafting" | "openings" | "modify" | "annotations" | "utilities";

export type WallType = "exterior" | "interior";
export type OpeningType = "door" | "sliding_door" | "window" | "double_door" | "corner_window" | "wall_opening";
export type WallAlignment = "center" | "left" | "right";
export type ColumnAlignMode = "none" | "center" | "outer_edge" | "corner";
export type FloorFillType = "tile" | "parquet" | "concrete";

export type SnapMode = "grid" | "endpoint" | "midpoint" | "intersection";
export type LayerName = "walls" | "openings" | "columns" | "furniture" | "annotations" | "fills" | "grid";

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
  layer?: string;
}

export interface ArcWall {
  id: string;
  cx: number;
  cy: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  thickness: number;
  height: number;
  wallType: WallType;
  layer?: string;
}

export interface CurtainWall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  height: number;
  mullionSpacing: number;
  panelWidth: number;
  layer?: string;
}

export interface Slab {
  id: string;
  points: Point[];
  thickness: number;
  height: number;
  layer?: string;
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
  isCircular?: boolean;
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

export interface AngularDimension {
  id: string;
  centerX: number;
  centerY: number;
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface LeaderArrow {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text?: string;
}

export interface AreaPolygon {
  id: string;
  points: Point[];
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

export interface ToolHandler {
  cursor?: string;
  onMouseDown?: (pos: Point, e: MouseEvent) => void;
  onMouseMove?: (pos: Point, e: MouseEvent) => void;
  onMouseUp?: (pos: Point, e: MouseEvent) => void;
  onClick?: (pos: Point, e: MouseEvent) => void;
  onDblClick?: (pos: Point, e: MouseEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  cleanup?: () => void;
}

export interface SnapResult {
  point: Point;
  type: SnapMode | "none";
  distance: number;
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

export const TOOL_SHORTCUTS: Record<Tool, string> = {
  select: "V",
  move_pan: "G",
  rotate: "R",
  trim: "T",
  extend: "X",
  offset: "O",
  split: "S",
  mirror: "M",
  eraser: "E",
  wall_single: "W",
  wall_polyline: "Y",
  wall_arc: "A",
  room_rectangle: "Shift+R",
  column_square: "C",
  column_circular: "Shift+C",
  curtain_wall: "U",
  slab_floor: "Shift+S",
  door_single: "D",
  door_double: "Shift+D",
  door_sliding: "Shift+W",
  window_standard: "Shift+Z",
  window_corner: "Shift+X",
  wall_opening: "Shift+O",
  dimension_linear: "L",
  dimension_angle: "Shift+L",
  area_inspector: "Z",
  text_annotation: "N",
  leader_arrow: "Shift+N",
  tape_measure: "F",
  color_fill: "H",
  layer_toggle: "K",
  grid_config: "Shift+G",
};

export const TOOL_LABELS: Record<Tool, string> = {
  select: "Select",
  move_pan: "Move/Pan",
  rotate: "Rotate",
  trim: "Trim",
  extend: "Extend",
  offset: "Offset",
  split: "Split",
  mirror: "Mirror",
  eraser: "Eraser",
  wall_single: "Single Wall",
  wall_polyline: "Polyline Wall",
  wall_arc: "Arc Wall",
  room_rectangle: "Rectangular Room",
  column_square: "Square Column",
  column_circular: "Circular Column",
  curtain_wall: "Curtain Wall",
  slab_floor: "Floor Slab",
  door_single: "Single Door",
  door_double: "Double Door",
  door_sliding: "Sliding Door",
  window_standard: "Standard Window",
  window_corner: "Corner Window",
  wall_opening: "Wall Opening",
  dimension_linear: "Linear Dimension",
  dimension_angle: "Angular Dimension",
  area_inspector: "Area Inspector",
  text_annotation: "Text Annotation",
  leader_arrow: "Leader Arrow",
  tape_measure: "Tape Measure",
  color_fill: "Color Fill",
  layer_toggle: "Layer Toggle",
  grid_config: "Grid Config",
};

export const TOOL_CATEGORIES: Record<ToolCategory, Tool[]> = {
  drafting: ["wall_single", "wall_polyline", "wall_arc", "room_rectangle", "column_square", "column_circular", "curtain_wall", "slab_floor"],
  openings: ["door_single", "door_double", "door_sliding", "window_standard", "window_corner", "wall_opening"],
  modify: ["select", "move_pan", "rotate", "trim", "extend", "offset", "split", "mirror", "eraser"],
  annotations: ["dimension_linear", "dimension_angle", "area_inspector", "text_annotation", "leader_arrow"],
  utilities: ["tape_measure", "color_fill", "layer_toggle", "grid_config"],
};

export interface EditorState {
  activeTool: Tool;
  activeCategory: ToolCategory;
  gridVisible: boolean;
  snapSize: number;
  snapModes: SnapMode[];
  wallAlignment: WallAlignment;
  wallThickness: number;
  columnAlignMode: ColumnAlignMode;
  offsetDistance: number;
  tapeMeasurePoints: Point[];
  arcWallPoints: Point[];
  polylinePoints: Point[];
  dimensionAngleCenter: Point | null;
  dimensionAngleStart: Point | null;
  areaPolygonPoints: Point[];
  leaderArrowStart: Point | null;
  isDrawing: boolean;
  visibleLayers: Record<LayerName, boolean>;
  tapeMeasureLines: MeasureLine[];
  roomPolygons: AreaPolygon[];
  walls: Wall[];
  arcWalls: ArcWall[];
  curtainWalls: CurtainWall[];
  slabs: Slab[];
  openings: Opening[];
  columns: Column[];
  labels: FloorLabel[];
  measureLines: MeasureLine[];
  angularDimensions: AngularDimension[];
  leaderArrows: LeaderArrow[];
  areaPolygons: AreaPolygon[];
  floorFills: FloorFill[];
  furniture: FurnitureItem[];
  selectedWallId: string | null;
  selectedArcWallId: string | null;
  selectedCurtainWallId: string | null;
  selectedSlabId: string | null;
  selectedOpeningId: string | null;
  selectedColumnId: string | null;
  selectedLabelId: string | null;
  selectedMeasureLineId: string | null;
  selectedFurnitureId: string | null;
  selectedFillId: string | null;
  history: { walls: Wall[]; arcWalls: ArcWall[]; curtainWalls: CurtainWall[]; slabs: Slab[] }[];
  historyIndex: number;
  landWidth: number;
  landLength: number;
  wallHeight: number;
  wallType: WallType;
  activeLayer: string;
  layers: string[];
  wireframeMode: boolean;
  is3DFullscreen: boolean;
  catalogVisible: boolean;
  activeFurnitureTemplate: FurnitureTemplate | null;
}

export interface EditorActions {
  setActiveTool: (tool: Tool) => void;
  setActiveCategory: (cat: ToolCategory) => void;
  toggleGrid: () => void;
  setSnapSize: (size: number) => void;
  setSnapModes: (modes: SnapMode[]) => void;
  toggleSnapMode: (mode: SnapMode) => void;
  setWallAlignment: (align: WallAlignment) => void;
  setWallThickness: (t: number) => void;
  setColumnAlignMode: (mode: ColumnAlignMode) => void;
  setOffsetDistance: (dist: number) => void;
  setTapeMeasurePoints: (pts: Point[]) => void;
  setArcWallPoints: (pts: Point[]) => void;
  setPolylinePoints: (pts: Point[]) => void;
  setIsDrawing: (d: boolean) => void;
  setDimensionAngleCenter: (p: Point | null) => void;
  setDimensionAngleStart: (p: Point | null) => void;
  setAreaPolygonPoints: (pts: Point[]) => void;
  setLeaderArrowStart: (p: Point | null) => void;
  addWall: (wall: Wall) => void;
  addWalls: (walls: Wall[]) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  deleteWall: (id: string) => void;
  selectWall: (id: string | null) => void;
  addArcWall: (aw: ArcWall) => void;
  updateArcWall: (id: string, updates: Partial<ArcWall>) => void;
  deleteArcWall: (id: string) => void;
  selectArcWall: (id: string | null) => void;
  addCurtainWall: (cw: CurtainWall) => void;
  updateCurtainWall: (id: string, updates: Partial<CurtainWall>) => void;
  deleteCurtainWall: (id: string) => void;
  selectCurtainWall: (id: string | null) => void;
  addSlab: (s: Slab) => void;
  updateSlab: (id: string, updates: Partial<Slab>) => void;
  deleteSlab: (id: string) => void;
  selectSlab: (id: string | null) => void;
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
  addAngularDimension: (ad: AngularDimension) => void;
  addLeaderArrow: (la: LeaderArrow) => void;
  addAreaPolygon: (ap: AreaPolygon) => void;
  deleteAreaPolygon: (id: string) => void;
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
  setActiveLayer: (l: string) => void;
  addLayer: (l: string) => void;
  setWireframeMode: (mode: boolean) => void;
  setIs3DFullscreen: (fullscreen: boolean) => void;
  setCatalogVisible: (visible: boolean) => void;
  setActiveFurnitureTemplate: (template: FurnitureTemplate | null) => void;
  resetDrawingState: () => void;
  toggleLayerVisibility: (layer: LayerName) => void;
  setLayerVisibility: (layer: LayerName, visible: boolean) => void;
  addTapeMeasureLine: (line: MeasureLine) => void;
  clearTapeMeasureLines: () => void;
  addRoomPolygon: (ap: AreaPolygon) => void;
  removeRoomPolygon: (id: string) => void;
  clearRoomPolygons: () => void;
}
