import { create } from "zustand";
import type { EditorState, EditorActions } from "@/types/editor";

type EditorStore = EditorState & EditorActions;

function pushHistory(state: EditorState): Partial<EditorState> {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(JSON.parse(JSON.stringify(state.walls)));
  if (newHistory.length > 50) newHistory.shift();
  return {
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

export const useEditorStore = create<EditorStore>((set) => ({
  activeTool: "select",
  gridVisible: true,
  walls: [],
  selectedWallId: null,
  history: [[]],
  historyIndex: 0,

  setActiveTool: (tool) => set({ activeTool: tool }),

  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),

  addWall: (wall) =>
    set((s) => ({
      walls: [...s.walls, wall],
      ...pushHistory({ ...s, walls: [...s.walls, wall] }),
    })),

  updateWall: (id, updates) =>
    set((s) => {
      const newWalls = s.walls.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      );
      return {
        walls: newWalls,
        ...pushHistory({ ...s, walls: newWalls }),
      };
    }),

  deleteWall: (id) =>
    set((s) => {
      const newWalls = s.walls.filter((w) => w.id !== id);
      return {
        walls: newWalls,
        selectedWallId: s.selectedWallId === id ? null : s.selectedWallId,
        ...pushHistory({ ...s, walls: newWalls }),
      };
    }),

  selectWall: (id) => set({ selectedWallId: id }),

  undo: () =>
    set((s) => {
      if (s.historyIndex <= 0) return s;
      const newIndex = s.historyIndex - 1;
      return {
        walls: JSON.parse(JSON.stringify(s.history[newIndex])),
        historyIndex: newIndex,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.historyIndex >= s.history.length - 1) return s;
      const newIndex = s.historyIndex + 1;
      return {
        walls: JSON.parse(JSON.stringify(s.history[newIndex])),
        historyIndex: newIndex,
      };
    }),

  clearSelection: () => set({ selectedWallId: null }),
}));
