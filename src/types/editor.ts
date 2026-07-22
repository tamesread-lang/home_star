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
