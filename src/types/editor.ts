export type Tool = "select" | "wall" | "eraser" | "dimension";

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
}

export function wallLengthMeters(wall: Wall, gridSize: number): number {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  return Math.sqrt(dx * dx + dy * dy) / gridSize;
}

export interface EditorState {
  activeTool: Tool;
  gridVisible: boolean;
  walls: Wall[];
  selectedWallId: string | null;
  history: Wall[][];
  historyIndex: number;
  landWidth: number;
  landLength: number;
}

export interface EditorActions {
  setActiveTool: (tool: Tool) => void;
  toggleGrid: () => void;
  addWall: (wall: Wall) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  deleteWall: (id: string) => void;
  selectWall: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  clearSelection: () => void;
  setLandWidth: (width: number) => void;
  setLandLength: (length: number) => void;
}
