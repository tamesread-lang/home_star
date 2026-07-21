export type Tool = "select" | "wall" | "eraser" | "dimension";

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  width: number;
  height: number;
}

export interface EditorState {
  activeTool: Tool;
  gridVisible: boolean;
  walls: Wall[];
  selectedWallId: string | null;
  history: Wall[][];
  historyIndex: number;
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
}
