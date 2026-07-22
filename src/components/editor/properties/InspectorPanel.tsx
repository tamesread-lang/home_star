"use client";

import { useEditorStore } from "@/store/editor-store";
import { useMemo } from "react";
import { getDefaultThickness, TOOL_LABELS } from "@/constants/editor";
import { wallLengthMeters, wallLengthFromMeters, polygonArea, distance } from "@/utils/geometry";
import type { Tool, SnapMode } from "@/types/editor";

const SNAP_OPTIONS = [
  { label: "1.0 m", value: 50 },
  { label: "0.5 m", value: 25 },
  { label: "0.1 m", value: 5 },
  { label: "Free", value: 0 },
];

const WALL_ALIGN_OPTIONS = [
  { label: "Center", value: "center" as const },
  { label: "Left", value: "left" as const },
  { label: "Right", value: "right" as const },
];

const COLUMN_ALIGN_OPTIONS = [
  { label: "None", value: "none" as const },
  { label: "Center", value: "center" as const },
  { label: "Outer Edge", value: "outer_edge" as const },
  { label: "Corner", value: "corner" as const },
];

const FILL_TYPE_OPTIONS = [
  { label: "Tile", value: "tile" as const },
  { label: "Parquet", value: "parquet" as const },
  { label: "Concrete", value: "concrete" as const },
];

const SNAP_MODES: { label: string; value: SnapMode }[] = [
  { label: "Grid", value: "grid" },
  { label: "Endpoint", value: "endpoint" },
  { label: "Midpoint", value: "midpoint" },
  { label: "Intersection", value: "intersection" },
];

const TOOL_TIP_TEXT: Record<string, string> = {
  wall_single: "Click-drag to draw a straight wall segment",
  wall_polyline: "Click to add connected wall segments, Enter to finish",
  wall_arc: "Click center, then start point, then end point",
  room_rectangle: "Click-drag to create a rectangular room",
  column_square: "Click to place a square structural column",
  column_circular: "Click to place a circular column",
  curtain_wall: "Click-drag to create a curtain wall panel",
  slab_floor: "Click to add points, Enter to place floor slab",
  door_single: "Click on a wall to add a single door",
  door_double: "Click on a wall to add a double door",
  door_sliding: "Click on a wall to add a sliding door",
  window_standard: "Click on a wall to add a standard window",
  window_corner: "Click on a wall to add a corner window",
  wall_opening: "Click on a wall to add a plain opening",
  select: "Click to select elements. Use Delete to remove",
  move_pan: "Click and drag selected wall to move it",
  rotate: "Click furniture to rotate 45 degrees",
  trim: "Click a wall near an intersection to trim it",
  extend: "Click a wall near an intersection to extend it",
  offset: "Click a wall to create a parallel offset",
  split: "Click a wall to split it into two segments",
  mirror: "Click a wall to mirror it across its midpoint",
  eraser: "Click any element to delete it",
  dimension_linear: "Click two points to create a linear dimension",
  dimension_angle: "Click center, start, then end to measure angle",
  area_inspector: "Click points to define area, Enter to finish",
  text_annotation: "Click to place a text annotation",
  leader_arrow: "Click start and end, optionally add text",
  tape_measure: "Click two points for precise measurement",
  color_fill: "Click to place a colored floor fill region",
  layer_toggle: "Click to cycle through active layers",
  grid_config: "Click to cycle grid snap sizes",
};

export default function InspectorPanel() {
  const walls = useEditorStore((s) => s.walls);
  const arcWalls = useEditorStore((s) => s.arcWalls);
  const curtainWalls = useEditorStore((s) => s.curtainWalls);
  const slabs = useEditorStore((s) => s.slabs);
  const openings = useEditorStore((s) => s.openings);
  const columns = useEditorStore((s) => s.columns);
  const labels = useEditorStore((s) => s.labels);
  const floorFills = useEditorStore((s) => s.floorFills);
  const furniture = useEditorStore((s) => s.furniture);
  const measureLines = useEditorStore((s) => s.measureLines);
  const angularDimensions = useEditorStore((s) => s.angularDimensions);
  const leaderArrows = useEditorStore((s) => s.leaderArrows);
  const areaPolygons = useEditorStore((s) => s.areaPolygons);
  const activeTool = useEditorStore((s) => s.activeTool);
  const selectedWallId = useEditorStore((s) => s.selectedWallId);
  const selectedArcWallId = useEditorStore((s) => s.selectedArcWallId);
  const selectedCurtainWallId = useEditorStore((s) => s.selectedCurtainWallId);
  const selectedSlabId = useEditorStore((s) => s.selectedSlabId);
  const selectedOpeningId = useEditorStore((s) => s.selectedOpeningId);
  const selectedColumnId = useEditorStore((s) => s.selectedColumnId);
  const selectedLabelId = useEditorStore((s) => s.selectedLabelId);
  const selectedFurnitureId = useEditorStore((s) => s.selectedFurnitureId);
  const selectedFillId = useEditorStore((s) => s.selectedFillId);
  const landWidth = useEditorStore((s) => s.landWidth);
  const landLength = useEditorStore((s) => s.landLength);
  const wallHeight = useEditorStore((s) => s.wallHeight);
  const wallType = useEditorStore((s) => s.wallType);
  const snapSize = useEditorStore((s) => s.snapSize);
  const snapModes = useEditorStore((s) => s.snapModes);
  const wallAlignment = useEditorStore((s) => s.wallAlignment);
  const columnAlignMode = useEditorStore((s) => s.columnAlignMode);
  const offsetDistance = useEditorStore((s) => s.offsetDistance);
  const wireframeMode = useEditorStore((s) => s.wireframeMode);
  const activeLayer = useEditorStore((s) => s.activeLayer);
  const layers = useEditorStore((s) => s.layers);

  const setLandWidth = useEditorStore((s) => s.setLandWidth);
  const setLandLength = useEditorStore((s) => s.setLandLength);
  const setWallHeight = useEditorStore((s) => s.setWallHeight);
  const setWallType = useEditorStore((s) => s.setWallType);
  const setSnapSize = useEditorStore((s) => s.setSnapSize);
  const toggleSnapMode = useEditorStore((s) => s.toggleSnapMode);
  const setWallAlignment = useEditorStore((s) => s.setWallAlignment);
  const setColumnAlignMode = useEditorStore((s) => s.setColumnAlignMode);
  const setOffsetDistance = useEditorStore((s) => s.setOffsetDistance);
  const setWireframeMode = useEditorStore((s) => s.setWireframeMode);
  const setActiveLayer = useEditorStore((s) => s.setActiveLayer);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const updateWall = useEditorStore((s) => s.updateWall);
  const updateOpening = useEditorStore((s) => s.updateOpening);
  const deleteOpening = useEditorStore((s) => s.deleteOpening);
  const updateColumn = useEditorStore((s) => s.updateColumn);
  const updateLabel = useEditorStore((s) => s.updateLabel);
  const updateFloorFill = useEditorStore((s) => s.updateFloorFill);
  const deleteFloorFill = useEditorStore((s) => s.deleteFloorFill);
  const updateFurniture = useEditorStore((s) => s.updateFurniture);
  const deleteFurniture = useEditorStore((s) => s.deleteFurniture);
  const updateArcWall = useEditorStore((s) => s.updateArcWall);
  const updateCurtainWall = useEditorStore((s) => s.updateCurtainWall);
  const updateSlab = useEditorStore((s) => s.updateSlab);
  const deleteAreaPolygon = useEditorStore((s) => s.deleteAreaPolygon);

  const selectedWall = useMemo(
    () => walls.find((w) => w.id === selectedWallId) ?? null,
    [walls, selectedWallId]
  );
  const selectedArcWall = useMemo(
    () => arcWalls.find((a) => a.id === selectedArcWallId) ?? null,
    [arcWalls, selectedArcWallId]
  );
  const selectedCurtainWall = useMemo(
    () => curtainWalls.find((c) => c.id === selectedCurtainWallId) ?? null,
    [curtainWalls, selectedCurtainWallId]
  );
  const selectedSlab = useMemo(
    () => slabs.find((s) => s.id === selectedSlabId) ?? null,
    [slabs, selectedSlabId]
  );
  const selectedOpening = useMemo(
    () => openings.find((o) => o.id === selectedOpeningId) ?? null,
    [openings, selectedOpeningId]
  );
  const selectedColumn = useMemo(
    () => columns.find((c) => c.id === selectedColumnId) ?? null,
    [columns, selectedColumnId]
  );
  const selectedLabel = useMemo(
    () => labels.find((l) => l.id === selectedLabelId) ?? null,
    [labels, selectedLabelId]
  );
  const selectedFurniture = useMemo(
    () => furniture.find((f) => f.id === selectedFurnitureId) ?? null,
    [furniture, selectedFurnitureId]
  );
  const selectedFill = useMemo(
    () => floorFills.length === 1 ? floorFills[0] : null,
    [floorFills]
  );

  const totalArea = (landWidth * landLength).toFixed(2);
  const totalWallLen = walls.reduce((s, w) => s + distance({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }), 0) / 50;
  const hasSelection = selectedWall || selectedArcWall || selectedCurtainWall || selectedSlab
    || selectedOpening || selectedColumn || selectedLabel || selectedFurniture || selectedFill;

  return (
    <aside className="w-60 border-l border-border bg-surface p-4 shrink-0 overflow-y-auto">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
        {TOOL_LABELS[activeTool] || "Properties"}
      </h2>

      <div className="space-y-4">
        {TOOL_TIP_TEXT[activeTool] && (
          <div className="text-[10px] text-muted/70 leading-relaxed bg-surface-alt rounded p-2 border border-border">
            {TOOL_TIP_TEXT[activeTool]}
          </div>
        )}

        <div>
          <h3 className="text-xs font-medium text-muted mb-2">Land Dimensions</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Width (m)</label>
              <input type="number" min={1} max={100} step={0.5} value={landWidth}
                onChange={(e) => setLandWidth(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Length (m)</label>
              <input type="number" min={1} max={100} step={0.5} value={landLength}
                onChange={(e) => setLandLength(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Area</label>
              <span className="text-sm font-mono tabular-nums font-semibold text-accent">{totalArea} m\u00B2</span>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-border" />

        <div>
          <h3 className="text-xs font-medium text-muted mb-2">Snap Engine</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Size</label>
              <div className="flex gap-1">
                {SNAP_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => setSnapSize(opt.value)}
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      snapSize === opt.value ? "bg-accent text-white border-accent" : "bg-surface-alt text-muted border-border hover:border-accent"
                    }`}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {SNAP_MODES.map((mode) => (
                <button key={mode.value} onClick={() => toggleSnapMode(mode.value)}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    snapModes.includes(mode.value) ? "bg-accent text-white border-accent" : "bg-surface-alt text-muted border-border hover:border-accent"
                  }`}>{mode.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-border" />

        <div>
          <h3 className="text-xs font-medium text-muted mb-2">Wall Drawing</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Align</label>
              <div className="flex gap-1">
                {WALL_ALIGN_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => setWallAlignment(opt.value)}
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      wallAlignment === opt.value ? "bg-accent text-white border-accent" : "bg-surface-alt text-muted border-border hover:border-accent"
                    }`}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Offset (m)</label>
              <input type="number" min={0.05} max={2} step={0.05} value={offsetDistance}
                onChange={(e) => setOffsetDistance(Math.max(0.05, parseFloat(e.target.value) || 0.05))}
                className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-border" />

        <div>
          <h3 className="text-xs font-medium text-muted mb-2">Column Alignment</h3>
          <div className="flex flex-wrap gap-1">
            {COLUMN_ALIGN_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setColumnAlignMode(opt.value)}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  columnAlignMode === opt.value ? "bg-accent text-white border-accent" : "bg-surface-alt text-muted border-border hover:border-accent"
                }`}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-border" />

        <div>
          <h3 className="text-xs font-medium text-muted mb-2">Active Layer</h3>
          <div className="flex flex-wrap gap-1">
            {layers.map((l) => (
              <button key={l} onClick={() => setActiveLayer(l)}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  activeLayer === l ? "bg-accent text-white border-accent" : "bg-surface-alt text-muted border-border hover:border-accent"
                }`}>{l}</button>
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-border" />

        <div>
          <h3 className="text-xs font-medium text-muted mb-2">Global Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Wall H (m)</label>
              <input type="number" min={1} max={10} step={0.1} value={wallHeight}
                onChange={(e) => setWallHeight(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Wall Type</label>
              <div className="flex gap-1">
                <button onClick={() => setWallType("interior")}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${wallType === "interior" ? "bg-accent text-white border-accent" : "bg-surface-alt text-muted border-border hover:border-accent"}`}>Int</button>
                <button onClick={() => setWallType("exterior")}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${wallType === "exterior" ? "bg-accent text-white border-accent" : "bg-surface-alt text-muted border-border hover:border-accent"}`}>Ext</button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Walls</label>
              <span className="text-sm font-mono tabular-nums">{walls.length + arcWalls.length + curtainWalls.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Total Len</label>
              <span className="text-sm font-mono tabular-nums">{totalWallLen.toFixed(1)} m</span>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Wireframe</label>
              <button onClick={() => setWireframeMode(!wireframeMode)}
                className={`text-xs font-mono px-2 py-0.5 rounded border ${wireframeMode ? "bg-accent text-white border-accent" : "bg-surface-alt text-muted border-border hover:border-accent"}`}>
                {wireframeMode ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>

        {selectedWall && (
          <>
            <div className="w-full h-px bg-border" />
            <div>
              <h3 className="text-xs font-medium text-muted mb-2">Selected Wall</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Length (m)</label>
                  <input type="number" min={0.1} max={50} step={0.05}
                    value={wallLengthMeters(selectedWall, 50).toFixed(2)}
                    onChange={(e) => {
                      const newLen = Math.max(0.1, parseFloat(e.target.value) || 0.1);
                      const { x2, y2 } = wallLengthFromMeters(selectedWall.x1, selectedWall.y1, selectedWall.x2, selectedWall.y2, newLen, 50);
                      updateWall(selectedWall.id, { x2, y2 });
                    }}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Type</label>
                  <div className="flex gap-1">
                    <button onClick={() => updateWall(selectedWall.id, { wallType: "interior", thickness: getDefaultThickness("interior") })}
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${selectedWall.wallType === "interior" ? "bg-accent text-white border-accent" : "bg-surface-alt text-muted border-border hover:border-accent"}`}>Int</button>
                    <button onClick={() => updateWall(selectedWall.id, { wallType: "exterior", thickness: getDefaultThickness("exterior") })}
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${selectedWall.wallType === "exterior" ? "bg-accent text-white border-accent" : "bg-surface-alt text-muted border-border hover:border-accent"}`}>Ext</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Height (m)</label>
                  <input type="number" min={0.5} max={10} step={0.1} value={selectedWall.height}
                    onChange={(e) => updateWall(selectedWall.id, { height: Math.max(0.5, parseFloat(e.target.value) || 0.5) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Thickness (m)</label>
                  <input type="number" min={0.05} max={1} step={0.01} value={selectedWall.thickness}
                    onChange={(e) => updateWall(selectedWall.id, { thickness: Math.max(0.05, parseFloat(e.target.value) || 0.05) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Layer</label>
                  <select value={selectedWall.layer || "Default"} onChange={(e) => updateWall(selectedWall.id, { layer: e.target.value })}
                    className="w-24 text-right text-sm font-mono bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent">
                    {layers.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {selectedArcWall && (
          <>
            <div className="w-full h-px bg-border" />
            <div>
              <h3 className="text-xs font-medium text-muted mb-2">Arc Wall</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Radius (m)</label>
                  <input type="number" min={0.1} max={20} step={0.1} value={selectedArcWall.radius.toFixed(2)}
                    onChange={(e) => updateArcWall(selectedArcWall.id, { radius: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Thickness (m)</label>
                  <input type="number" min={0.05} max={1} step={0.01} value={selectedArcWall.thickness}
                    onChange={(e) => updateArcWall(selectedArcWall.id, { thickness: Math.max(0.05, parseFloat(e.target.value) || 0.05) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
              </div>
            </div>
          </>
        )}

        {selectedCurtainWall && (
          <>
            <div className="w-full h-px bg-border" />
            <div>
              <h3 className="text-xs font-medium text-muted mb-2">Curtain Wall</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Height (m)</label>
                  <input type="number" min={0.5} max={10} step={0.1} value={selectedCurtainWall.height}
                    onChange={(e) => updateCurtainWall(selectedCurtainWall.id, { height: Math.max(0.5, parseFloat(e.target.value) || 0.5) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Mullion (m)</label>
                  <input type="number" min={0.5} max={5} step={0.1} value={selectedCurtainWall.mullionSpacing}
                    onChange={(e) => updateCurtainWall(selectedCurtainWall.id, { mullionSpacing: Math.max(0.5, parseFloat(e.target.value) || 0.5) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
              </div>
            </div>
          </>
        )}

        {selectedSlab && (
          <>
            <div className="w-full h-px bg-border" />
            <div>
              <h3 className="text-xs font-medium text-muted mb-2">Floor Slab</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Area</label>
                  <span className="text-sm font-mono tabular-nums text-accent">
                    {polygonArea(selectedSlab.points).toFixed(2)} px
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Thickness (m)</label>
                  <input type="number" min={0.05} max={1} step={0.01} value={selectedSlab.thickness}
                    onChange={(e) => updateSlab(selectedSlab.id, { thickness: Math.max(0.05, parseFloat(e.target.value) || 0.05) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
              </div>
            </div>
          </>
        )}

        {selectedOpening && (
          <>
            <div className="w-full h-px bg-border" />
            <div>
              <h3 className="text-xs font-medium text-muted mb-2 capitalize">
                {selectedOpening.type.replace("_", " ")}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Width (m)</label>
                  <input type="number" min={0.3} max={3} step={0.05} value={selectedOpening.width}
                    onChange={(e) => updateOpening(selectedOpening.id, { width: Math.max(0.3, parseFloat(e.target.value) || 0.3) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Height (m)</label>
                  <input type="number" min={0.3} max={5} step={0.05} value={selectedOpening.height}
                    onChange={(e) => updateOpening(selectedOpening.id, { height: Math.max(0.3, parseFloat(e.target.value) || 0.3) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Position (%)</label>
                  <input type="number" min={0} max={100} step={1} value={Math.round(selectedOpening.position * 100)}
                    onChange={(e) => updateOpening(selectedOpening.id, { position: Math.max(0, Math.min(1, (parseFloat(e.target.value) || 0) / 100)) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                {selectedOpening.sillHeight > 0 && (
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-muted">Sill (m)</label>
                    <input type="number" min={0} max={2} step={0.05} value={selectedOpening.sillHeight}
                      onChange={(e) => updateOpening(selectedOpening.id, { sillHeight: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                  </div>
                )}
                <button onClick={() => deleteOpening(selectedOpening.id)}
                  className="w-full text-xs text-red-400 border border-red-400/30 rounded px-2 py-1 hover:bg-red-400/10 mt-2">
                  Delete {selectedOpening.type.replace("_", " ")}
                </button>
              </div>
            </div>
          </>
        )}

        {selectedColumn && (
          <>
            <div className="w-full h-px bg-border" />
            <div>
              <h3 className="text-xs font-medium text-muted mb-2">
                {selectedColumn.isCircular ? "Circular" : "Square"} Column
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Width (m)</label>
                  <input type="number" min={0.1} max={2} step={0.05} value={selectedColumn.width}
                    onChange={(e) => updateColumn(selectedColumn.id, { width: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Depth (m)</label>
                  <input type="number" min={0.1} max={2} step={0.05} value={selectedColumn.depth}
                    onChange={(e) => updateColumn(selectedColumn.id, { depth: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Height (m)</label>
                  <input type="number" min={0.5} max={10} step={0.1} value={selectedColumn.height}
                    onChange={(e) => updateColumn(selectedColumn.id, { height: Math.max(0.5, parseFloat(e.target.value) || 0.5) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <button onClick={() => { useEditorStore.getState().deleteColumn(selectedColumn.id); useEditorStore.getState().clearSelection(); }}
                  className="w-full text-xs text-red-400 border border-red-400/30 rounded px-2 py-1 hover:bg-red-400/10 mt-2">Delete Column</button>
              </div>
            </div>
          </>
        )}

        {selectedLabel && (
          <>
            <div className="w-full h-px bg-border" />
            <div>
              <h3 className="text-xs font-medium text-muted mb-2">Text Annotation</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Text</label>
                  <input type="text" value={selectedLabel.text}
                    onChange={(e) => updateLabel(selectedLabel.id, { text: e.target.value })}
                    className="w-32 text-right text-sm font-mono bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Rotation</label>
                  <input type="number" min={0} max={360} step={90} value={selectedLabel.rotation}
                    onChange={(e) => updateLabel(selectedLabel.id, { rotation: parseFloat(e.target.value) || 0 })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <button onClick={() => { useEditorStore.getState().deleteLabel(selectedLabel.id); useEditorStore.getState().clearSelection(); }}
                  className="w-full text-xs text-red-400 border border-red-400/30 rounded px-2 py-1 hover:bg-red-400/10 mt-2">Delete Label</button>
              </div>
            </div>
          </>
        )}

        {selectedFurniture && (
          <>
            <div className="w-full h-px bg-border" />
            <div>
              <h3 className="text-xs font-medium text-muted mb-2">{selectedFurniture.name}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Width (m)</label>
                  <input type="number" min={0.1} max={10} step={0.05} value={selectedFurniture.width}
                    onChange={(e) => updateFurniture(selectedFurniture.id, { width: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Depth (m)</label>
                  <input type="number" min={0.1} max={10} step={0.05} value={selectedFurniture.height}
                    onChange={(e) => updateFurniture(selectedFurniture.id, { height: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Elevation (m)</label>
                  <input type="number" min={0} max={10} step={0.05} value={selectedFurniture.elevation}
                    onChange={(e) => updateFurniture(selectedFurniture.id, { elevation: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Rotation</label>
                  <span className="text-sm font-mono tabular-nums">{selectedFurniture.rotation}\u00B0</span>
                </div>
                <div>
                  <input type="range" min={0} max={360} step={1} value={selectedFurniture.rotation}
                    onChange={(e) => updateFurniture(selectedFurniture.id, { rotation: parseFloat(e.target.value) })}
                    className="w-full accent-accent" />
                  <div className="flex justify-between text-[9px] text-muted/50 font-mono mt-0.5">
                    <span>0\u00B0</span><span>180\u00B0</span><span>360\u00B0</span>
                  </div>
                </div>
                <button onClick={() => updateFurniture(selectedFurniture.id, { rotation: (selectedFurniture.rotation + 90) % 360 })}
                  className="w-full text-xs text-accent border border-accent/30 rounded px-2 py-1 hover:bg-accent/10 mt-1">Rotate 90\u00B0</button>
                <button onClick={() => { useEditorStore.getState().deleteFurniture(selectedFurniture.id); useEditorStore.getState().clearSelection(); }}
                  className="w-full text-xs text-red-400 border border-red-400/30 rounded px-2 py-1 hover:bg-red-400/10 mt-1">Delete</button>
              </div>
            </div>
          </>
        )}

        {selectedFill && (
          <>
            <div className="w-full h-px bg-border" />
            <div>
              <h3 className="text-xs font-medium text-muted mb-2">Floor Fill</h3>
              <div className="space-y-2">
                <label className="text-sm text-muted">Material</label>
                <div className="flex flex-wrap gap-1">
                  {FILL_TYPE_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => updateFloorFill(selectedFill.id, { fillType: opt.value })}
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        selectedFill.fillType === opt.value ? "bg-accent text-white border-accent" : "bg-surface-alt text-muted border-border hover:border-accent"
                      }`}>{opt.label}</button>
                  ))}
                </div>
                <button onClick={() => { useEditorStore.getState().deleteFloorFill(selectedFill.id); }}
                  className="w-full text-xs text-red-400 border border-red-400/30 rounded px-2 py-1 hover:bg-red-400/10 mt-2">Remove Fill</button>
              </div>
            </div>
          </>
        )}

        {!hasSelection && (
          <p className="text-xs text-muted/50 text-center pt-2">Select an element to edit its properties</p>
        )}
      </div>
    </aside>
  );
}
