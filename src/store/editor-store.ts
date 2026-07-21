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
  snapSize: 25,
  walls: [],
  openings: [],
  furniture: [],
  selectedWallId: null,
  selectedOpeningId: null,
  selectedFurnitureId: null,
  history: [[]],
  historyIndex: 0,
  landWidth: 12,
  landLength: 10,
  wallHeight: 3,
  wallType: "interior",
  wireframeMode: false,
  is3DFullscreen: false,
  catalogVisible: false,
  activeFurnitureTemplate: null,

  setActiveTool: (tool) =>
    set({
      activeTool: tool,
      selectedWallId: null,
      selectedOpeningId: null,
      selectedFurnitureId: null,
    }),

  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),

  setSnapSize: (size) => set({ snapSize: size }),

  setLandWidth: (width) => set({ landWidth: width }),

  setLandLength: (length) => set({ landLength: length }),

  setWallHeight: (height) => set({ wallHeight: height }),

  setWallType: (type) => set({ wallType: type }),

  setWireframeMode: (mode) => set({ wireframeMode: mode }),

  setIs3DFullscreen: (fullscreen) => set({ is3DFullscreen: fullscreen }),

  setCatalogVisible: (visible) => set({ catalogVisible: visible }),

  setActiveFurnitureTemplate: (template) =>
    set({ activeFurnitureTemplate: template }),

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
      const newOpenings = s.openings.filter((o) => o.wallId !== id);
      return {
        walls: newWalls,
        openings: newOpenings,
        selectedWallId: s.selectedWallId === id ? null : s.selectedWallId,
        selectedOpeningId:
          s.selectedOpeningId &&
          newOpenings.every((o) => o.id !== s.selectedOpeningId)
            ? null
            : s.selectedOpeningId,
        ...pushHistory({ ...s, walls: newWalls }),
      };
    }),

  selectWall: (id) =>
    set({ selectedWallId: id, selectedOpeningId: null, selectedFurnitureId: null }),

  addOpening: (opening) =>
    set((s) => ({
      openings: [...s.openings, opening],
    })),

  updateOpening: (id, updates) =>
    set((s) => ({
      openings: s.openings.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      ),
    })),

  deleteOpening: (id) =>
    set((s) => ({
      openings: s.openings.filter((o) => o.id !== id),
      selectedOpeningId:
        s.selectedOpeningId === id ? null : s.selectedOpeningId,
    })),

  selectOpening: (id) =>
    set({ selectedOpeningId: id, selectedWallId: null, selectedFurnitureId: null }),

  addFurniture: (item) =>
    set((s) => ({
      furniture: [...s.furniture, item],
    })),

  updateFurniture: (id, updates) =>
    set((s) => ({
      furniture: s.furniture.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    })),

  deleteFurniture: (id) =>
    set((s) => ({
      furniture: s.furniture.filter((f) => f.id !== id),
      selectedFurnitureId:
        s.selectedFurnitureId === id ? null : s.selectedFurnitureId,
    })),

  selectFurniture: (id) =>
    set({ selectedFurnitureId: id, selectedWallId: null, selectedOpeningId: null }),

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

  clearSelection: () =>
    set({
      selectedWallId: null,
      selectedOpeningId: null,
      selectedFurnitureId: null,
    }),
}));
