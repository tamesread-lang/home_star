export type Tool =
  | "select" | "wall" | "room" | "door" | "window" | "eraser";

export type WallType = "exterior" | "interior";

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
  type: "door" | "window";
  position: number;
  width: number;
  height: number;
  sillHeight: number;
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
}

export interface FurnitureTemplate {
  name: string;
  width: number;
  height: number;
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

export const FURNITURE_CATALOG: Record<string, FurnitureTemplate[]> = {
  "Living Room": [
    { name: "Sofa", width: 2.0, height: 0.9 },
    { name: "Coffee Table", width: 1.2, height: 0.6 },
    { name: "TV Stand", width: 1.8, height: 0.5 },
  ],
  "Bedroom": [
    { name: "Double Bed", width: 1.8, height: 2.0 },
    { name: "Single Bed", width: 1.0, height: 2.0 },
    { name: "Wardrobe", width: 1.2, height: 0.6 },
    { name: "Nightstand", width: 0.5, height: 0.5 },
  ],
  "Bathroom": [
    { name: "Sink", width: 0.6, height: 0.5 },
    { name: "Toilet", width: 0.4, height: 0.7 },
    { name: "Bathtub", width: 1.7, height: 0.8 },
  ],
  "Kitchen": [
    { name: "Dining Table", width: 1.5, height: 0.9 },
    { name: "Stove", width: 0.6, height: 0.6 },
    { name: "Fridge", width: 0.7, height: 0.7 },
  ],
};

export function getDefaultThickness(wallType: WallType): number {
  return wallType === "exterior" ? 0.3 : 0.15;
}

export interface EditorState {
  activeTool: Tool;
  gridVisible: boolean;
  snapSize: number;
  walls: Wall[];
  openings: Opening[];
  furniture: FurnitureItem[];
  selectedWallId: string | null;
  selectedOpeningId: string | null;
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
}

export interface EditorActions {
  setActiveTool: (tool: Tool) => void;
  toggleGrid: () => void;
  setSnapSize: (size: number) => void;
  addWall: (wall: Wall) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  deleteWall: (id: string) => void;
  selectWall: (id: string | null) => void;
  addOpening: (opening: Opening) => void;
  updateOpening: (id: string, updates: Partial<Opening>) => void;
  deleteOpening: (id: string) => void;
  selectOpening: (id: string | null) => void;
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
