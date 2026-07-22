import { create } from "zustand";
import type {
  EditorState, EditorActions, Wall, ArcWall, CurtainWall, Slab,
} from "@/types/editor";

type EditorStore = EditorState & EditorActions;

interface HistorySnapshot {
  walls: Wall[];
  arcWalls: ArcWall[];
  curtainWalls: CurtainWall[];
  slabs: Slab[];
}

function pushHistory(state: EditorState): Partial<EditorState> {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push({
    walls: JSON.parse(JSON.stringify(state.walls)),
    arcWalls: JSON.parse(JSON.stringify(state.arcWalls)),
    curtainWalls: JSON.parse(JSON.stringify(state.curtainWalls)),
    slabs: JSON.parse(JSON.stringify(state.slabs)),
  });
  if (newHistory.length > 50) newHistory.shift();
  return {
    history: newHistory as HistorySnapshot[],
    historyIndex: newHistory.length - 1,
  };
}

export const useEditorStore = create<EditorStore>((set) => ({
  activeTool: "select",
  activeCategory: "drafting",
  gridVisible: true,
  snapSize: 25,
  snapModes: ["grid", "endpoint"],
  wallAlignment: "center",
  wallThickness: 0.2,
  columnAlignMode: "none",
  offsetDistance: 0.2,
  tapeMeasurePoints: [],
  arcWallPoints: [],
  polylinePoints: [],
  dimensionAngleCenter: null,
  dimensionAngleStart: null,
  areaPolygonPoints: [],
  leaderArrowStart: null,
  isDrawing: false,
  visibleLayers: {
    walls: true, openings: true, columns: true,
    furniture: true, annotations: true, fills: true, grid: true,
  },
  tapeMeasureLines: [],
  roomPolygons: [],
  walls: [],
  arcWalls: [],
  curtainWalls: [],
  slabs: [],
  openings: [],
  columns: [],
  labels: [],
  measureLines: [],
  angularDimensions: [],
  leaderArrows: [],
  areaPolygons: [],
  floorFills: [],
  furniture: [],
  selectedWallId: null,
  selectedArcWallId: null,
  selectedCurtainWallId: null,
  selectedSlabId: null,
  selectedOpeningId: null,
  selectedColumnId: null,
  selectedLabelId: null,
  selectedMeasureLineId: null,
  selectedFurnitureId: null,
  selectedFillId: null,
  history: [{ walls: [], arcWalls: [], curtainWalls: [], slabs: [] }],
  historyIndex: 0,
  landWidth: 12,
  landLength: 10,
  wallHeight: 3,
  wallType: "interior",
  activeLayer: "Default",
  layers: ["Default", "Walls", "Openings", "Furniture", "Annotations"],
  wireframeMode: false,
  is3DFullscreen: false,
  catalogVisible: false,
  activeFurnitureTemplate: null,

  setActiveTool: (tool) =>
    set({
      activeTool: tool,
      selectedWallId: null,
      selectedArcWallId: null,
      selectedCurtainWallId: null,
      selectedSlabId: null,
      selectedOpeningId: null,
      selectedColumnId: null,
      selectedLabelId: null,
      selectedMeasureLineId: null,
      selectedFurnitureId: null,
      selectedFillId: null,
      isDrawing: false,
      tapeMeasurePoints: [],
      arcWallPoints: [],
      polylinePoints: [],
      dimensionAngleCenter: null,
      dimensionAngleStart: null,
      areaPolygonPoints: [],
      leaderArrowStart: null,
    }),

  setActiveCategory: (cat) => set({ activeCategory: cat }),

  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),

  setSnapSize: (size) => set({ snapSize: size }),

  setSnapModes: (modes) => set({ snapModes: modes }),

  toggleSnapMode: (mode) =>
    set((s) => {
      const has = s.snapModes.includes(mode);
      return {
        snapModes: has
          ? s.snapModes.filter((m) => m !== mode)
          : [...s.snapModes, mode],
      };
    }),

  setWallAlignment: (align) => set({ wallAlignment: align }),

  setWallThickness: (t) => set({ wallThickness: t }),

  setColumnAlignMode: (mode) => set({ columnAlignMode: mode }),

  setOffsetDistance: (dist) => set({ offsetDistance: dist }),

  setTapeMeasurePoints: (pts) => set({ tapeMeasurePoints: pts }),

  setArcWallPoints: (pts) => set({ arcWallPoints: pts }),

  setPolylinePoints: (pts) => set({ polylinePoints: pts }),

  setIsDrawing: (d) => set({ isDrawing: d }),

  setDimensionAngleCenter: (p) => set({ dimensionAngleCenter: p }),

  setDimensionAngleStart: (p) => set({ dimensionAngleStart: p }),

  setAreaPolygonPoints: (pts) => set({ areaPolygonPoints: pts }),

  setLeaderArrowStart: (p) => set({ leaderArrowStart: p }),

  setLandWidth: (width) => set({ landWidth: width }),

  setLandLength: (length) => set({ landLength: length }),

  setWallHeight: (height) => set({ wallHeight: height }),

  setWallType: (type) => set({ wallType: type }),

  setActiveLayer: (l) => set({ activeLayer: l }),

  addLayer: (l) =>
    set((s) => ({
      layers: s.layers.includes(l) ? s.layers : [...s.layers, l],
    })),

  setWireframeMode: (mode) => set({ wireframeMode: mode }),

  setIs3DFullscreen: (fullscreen) => set({ is3DFullscreen: fullscreen }),

  setCatalogVisible: (visible) => set({ catalogVisible: visible }),

  setActiveFurnitureTemplate: (template) =>
    set({ activeFurnitureTemplate: template }),

  resetDrawingState: () =>
    set({
      tapeMeasurePoints: [],
      arcWallPoints: [],
      polylinePoints: [],
      dimensionAngleCenter: null,
      dimensionAngleStart: null,
      areaPolygonPoints: [],
      leaderArrowStart: null,
      isDrawing: false,
    }),

  toggleLayerVisibility: (layer) =>
    set((s) => ({
      visibleLayers: { ...s.visibleLayers, [layer]: !s.visibleLayers[layer] },
    })),

  setLayerVisibility: (layer, visible) =>
    set((s) => ({
      visibleLayers: { ...s.visibleLayers, [layer]: visible },
    })),

  addTapeMeasureLine: (line) =>
    set((s) => ({
      tapeMeasureLines: [...s.tapeMeasureLines, line],
    })),

  clearTapeMeasureLines: () =>
    set({ tapeMeasureLines: [] }),

  addRoomPolygon: (ap) =>
    set((s) => ({
      roomPolygons: [...s.roomPolygons, ap],
    })),

  removeRoomPolygon: (id) =>
    set((s) => ({
      roomPolygons: s.roomPolygons.filter((r) => r.id !== id),
    })),

  clearRoomPolygons: () =>
    set({ roomPolygons: [] }),

  addWall: (wall) =>
    set((s) => ({
      walls: [...s.walls, wall],
      ...pushHistory({ ...s, walls: [...s.walls, wall] }),
    })),

  addWalls: (newWalls) =>
    set((s) => {
      const updated = [...s.walls, ...newWalls];
      return {
        walls: updated,
        ...pushHistory({ ...s, walls: updated }),
      };
    }),

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
          s.selectedOpeningId && newOpenings.every((o) => o.id !== s.selectedOpeningId)
            ? null
            : s.selectedOpeningId,
        ...pushHistory({ ...s, walls: newWalls }),
      };
    }),

  selectWall: (id) =>
    set({
      selectedWallId: id,
      selectedArcWallId: null,
      selectedCurtainWallId: null,
      selectedSlabId: null,
      selectedOpeningId: null,
      selectedColumnId: null,
      selectedLabelId: null,
      selectedMeasureLineId: null,
      selectedFurnitureId: null,
      selectedFillId: null,
    }),

  addArcWall: (aw) =>
    set((s) => ({
      arcWalls: [...s.arcWalls, aw],
      ...pushHistory({ ...s, arcWalls: [...s.arcWalls, aw] }),
    })),

  updateArcWall: (id, updates) =>
    set((s) => ({
      arcWalls: s.arcWalls.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  deleteArcWall: (id) =>
    set((s) => ({
      arcWalls: s.arcWalls.filter((a) => a.id !== id),
      selectedArcWallId: s.selectedArcWallId === id ? null : s.selectedArcWallId,
    })),

  selectArcWall: (id) =>
    set({
      selectedArcWallId: id,
      selectedWallId: null,
      selectedCurtainWallId: null,
      selectedSlabId: null,
      selectedOpeningId: null,
      selectedColumnId: null,
      selectedLabelId: null,
      selectedMeasureLineId: null,
      selectedFurnitureId: null,
      selectedFillId: null,
    }),

  addCurtainWall: (cw) =>
    set((s) => ({
      curtainWalls: [...s.curtainWalls, cw],
      ...pushHistory({ ...s, curtainWalls: [...s.curtainWalls, cw] }),
    })),

  updateCurtainWall: (id, updates) =>
    set((s) => ({
      curtainWalls: s.curtainWalls.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  deleteCurtainWall: (id) =>
    set((s) => ({
      curtainWalls: s.curtainWalls.filter((c) => c.id !== id),
      selectedCurtainWallId:
        s.selectedCurtainWallId === id ? null : s.selectedCurtainWallId,
    })),

  selectCurtainWall: (id) =>
    set({
      selectedCurtainWallId: id,
      selectedWallId: null,
      selectedArcWallId: null,
      selectedSlabId: null,
      selectedOpeningId: null,
      selectedColumnId: null,
      selectedLabelId: null,
      selectedMeasureLineId: null,
      selectedFurnitureId: null,
      selectedFillId: null,
    }),

  addSlab: (s) =>
    set((state) => ({
      slabs: [...state.slabs, s],
      ...pushHistory({ ...state, slabs: [...state.slabs, s] }),
    })),

  updateSlab: (id, updates) =>
    set((s) => ({
      slabs: s.slabs.map((sl) => (sl.id === id ? { ...sl, ...updates } : sl)),
    })),

  deleteSlab: (id) =>
    set((s) => ({
      slabs: s.slabs.filter((sl) => sl.id !== id),
      selectedSlabId: s.selectedSlabId === id ? null : s.selectedSlabId,
    })),

  selectSlab: (id) =>
    set({
      selectedSlabId: id,
      selectedWallId: null,
      selectedArcWallId: null,
      selectedCurtainWallId: null,
      selectedOpeningId: null,
      selectedColumnId: null,
      selectedLabelId: null,
      selectedMeasureLineId: null,
      selectedFurnitureId: null,
      selectedFillId: null,
    }),

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
    set({
      selectedOpeningId: id,
      selectedWallId: null,
      selectedArcWallId: null,
      selectedCurtainWallId: null,
      selectedSlabId: null,
      selectedColumnId: null,
      selectedLabelId: null,
      selectedMeasureLineId: null,
      selectedFurnitureId: null,
      selectedFillId: null,
    }),

  addColumn: (column) =>
    set((s) => ({
      columns: [...s.columns, column],
    })),

  updateColumn: (id, updates) =>
    set((s) => ({
      columns: s.columns.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  deleteColumn: (id) =>
    set((s) => ({
      columns: s.columns.filter((c) => c.id !== id),
      selectedColumnId:
        s.selectedColumnId === id ? null : s.selectedColumnId,
    })),

  selectColumn: (id) =>
    set({
      selectedColumnId: id,
      selectedWallId: null,
      selectedArcWallId: null,
      selectedCurtainWallId: null,
      selectedSlabId: null,
      selectedOpeningId: null,
      selectedLabelId: null,
      selectedMeasureLineId: null,
      selectedFurnitureId: null,
      selectedFillId: null,
    }),

  addLabel: (label) =>
    set((s) => ({
      labels: [...s.labels, label],
    })),

  updateLabel: (id, updates) =>
    set((s) => ({
      labels: s.labels.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    })),

  deleteLabel: (id) =>
    set((s) => ({
      labels: s.labels.filter((l) => l.id !== id),
      selectedLabelId:
        s.selectedLabelId === id ? null : s.selectedLabelId,
    })),

  selectLabel: (id) =>
    set({
      selectedLabelId: id,
      selectedWallId: null,
      selectedArcWallId: null,
      selectedCurtainWallId: null,
      selectedSlabId: null,
      selectedOpeningId: null,
      selectedColumnId: null,
      selectedMeasureLineId: null,
      selectedFurnitureId: null,
      selectedFillId: null,
    }),

  addMeasureLine: (line) =>
    set((s) => ({
      measureLines: [...s.measureLines, line],
    })),

  clearMeasureLines: () =>
    set({ measureLines: [] }),

  addAngularDimension: (ad) =>
    set((s) => ({
      angularDimensions: [...s.angularDimensions, ad],
    })),

  addLeaderArrow: (la) =>
    set((s) => ({
      leaderArrows: [...s.leaderArrows, la],
    })),

  addAreaPolygon: (ap) =>
    set((s) => ({
      areaPolygons: [...s.areaPolygons, ap],
    })),

  deleteAreaPolygon: (id) =>
    set((s) => ({
      areaPolygons: s.areaPolygons.filter((a) => a.id !== id),
    })),

  addFloorFill: (fill) =>
    set((s) => ({
      floorFills: [...s.floorFills, fill],
    })),

  updateFloorFill: (id, updates) =>
    set((s) => ({
      floorFills: s.floorFills.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    })),

  deleteFloorFill: (id) =>
    set((s) => ({
      floorFills: s.floorFills.filter((f) => f.id !== id),
    })),

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
    set({
      selectedFurnitureId: id,
      selectedWallId: null,
      selectedArcWallId: null,
      selectedCurtainWallId: null,
      selectedSlabId: null,
      selectedOpeningId: null,
      selectedColumnId: null,
      selectedLabelId: null,
      selectedMeasureLineId: null,
      selectedFillId: null,
    }),

  undo: () =>
    set((s) => {
      if (s.historyIndex <= 0) return s;
      const newIndex = s.historyIndex - 1;
      const snap = s.history[newIndex];
      return {
        walls: JSON.parse(JSON.stringify(snap.walls)),
        arcWalls: JSON.parse(JSON.stringify(snap.arcWalls)),
        curtainWalls: JSON.parse(JSON.stringify(snap.curtainWalls)),
        slabs: JSON.parse(JSON.stringify(snap.slabs)),
        historyIndex: newIndex,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.historyIndex >= s.history.length - 1) return s;
      const newIndex = s.historyIndex + 1;
      const snap = s.history[newIndex];
      return {
        walls: JSON.parse(JSON.stringify(snap.walls)),
        arcWalls: JSON.parse(JSON.stringify(snap.arcWalls)),
        curtainWalls: JSON.parse(JSON.stringify(snap.curtainWalls)),
        slabs: JSON.parse(JSON.stringify(snap.slabs)),
        historyIndex: newIndex,
      };
    }),

  clearSelection: () =>
    set({
      selectedWallId: null,
      selectedArcWallId: null,
      selectedCurtainWallId: null,
      selectedSlabId: null,
      selectedOpeningId: null,
      selectedColumnId: null,
      selectedLabelId: null,
      selectedMeasureLineId: null,
      selectedFurnitureId: null,
      selectedFillId: null,
    }),
}));
