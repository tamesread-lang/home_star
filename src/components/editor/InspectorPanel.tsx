"use client";

import { useEditorStore } from "@/store/editor-store";
import { useMemo } from "react";
import {
  wallLengthMeters,
  wallLengthFromMeters,
  getDefaultThickness,
} from "@/types/editor";
import type { WallType } from "@/types/editor";

const SNAP_OPTIONS = [
  { label: "1.0 m", value: 50 },
  { label: "0.5 m", value: 25 },
  { label: "0.1 m", value: 5 },
  { label: "Free", value: 0 },
];

export default function InspectorPanel() {
  const walls = useEditorStore((s) => s.walls);
  const openings = useEditorStore((s) => s.openings);
  const columns = useEditorStore((s) => s.columns);
  const labels = useEditorStore((s) => s.labels);
  const furniture = useEditorStore((s) => s.furniture);
  const selectedWallId = useEditorStore((s) => s.selectedWallId);
  const selectedOpeningId = useEditorStore((s) => s.selectedOpeningId);
  const selectedColumnId = useEditorStore((s) => s.selectedColumnId);
  const selectedLabelId = useEditorStore((s) => s.selectedLabelId);
  const selectedFurnitureId = useEditorStore((s) => s.selectedFurnitureId);
  const landWidth = useEditorStore((s) => s.landWidth);
  const landLength = useEditorStore((s) => s.landLength);
  const wallHeight = useEditorStore((s) => s.wallHeight);
  const wallType = useEditorStore((s) => s.wallType);
  const snapSize = useEditorStore((s) => s.snapSize);
  const wireframeMode = useEditorStore((s) => s.wireframeMode);
  const setLandWidth = useEditorStore((s) => s.setLandWidth);
  const setLandLength = useEditorStore((s) => s.setLandLength);
  const setWallHeight = useEditorStore((s) => s.setWallHeight);
  const setWallType = useEditorStore((s) => s.setWallType);
  const setSnapSize = useEditorStore((s) => s.setSnapSize);
  const setWireframeMode = useEditorStore((s) => s.setWireframeMode);
  const updateWall = useEditorStore((s) => s.updateWall);
  const updateOpening = useEditorStore((s) => s.updateOpening);
  const deleteOpening = useEditorStore((s) => s.deleteOpening);
  const updateColumn = useEditorStore((s) => s.updateColumn);
  const updateLabel = useEditorStore((s) => s.updateLabel);
  const updateFurniture = useEditorStore((s) => s.updateFurniture);
  const deleteFurniture = useEditorStore((s) => s.deleteFurniture);

  const selectedWall = useMemo(
    () => walls.find((w) => w.id === selectedWallId) ?? null,
    [walls, selectedWallId]
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

  const totalArea = (landWidth * landLength).toFixed(2);

  return (
    <aside className="w-60 border-l border-border bg-surface p-4 shrink-0 overflow-y-auto">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
        Properties
      </h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-medium text-muted mb-2">
            Land Dimensions
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Width (m)</label>
              <input
                type="number"
                min={1}
                max={100}
                step={0.5}
                value={landWidth}
                onChange={(e) =>
                  setLandWidth(Math.max(1, parseFloat(e.target.value) || 1))
                }
                className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Length (m)</label>
              <input
                type="number"
                min={1}
                max={100}
                step={0.5}
                value={landLength}
                onChange={(e) =>
                  setLandLength(Math.max(1, parseFloat(e.target.value) || 1))
                }
                className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Area</label>
              <span className="text-sm font-mono tabular-nums font-semibold text-accent">
                {totalArea} m&sup2;
              </span>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-border" />

        <div>
          <h3 className="text-xs font-medium text-muted mb-2">Grid & Snap</h3>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {SNAP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSnapSize(opt.value)}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    snapSize === opt.value
                      ? "bg-accent text-white border-accent"
                      : "bg-surface-alt text-muted border-border hover:border-accent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-border" />

        <div>
          <h3 className="text-xs font-medium text-muted mb-2">
            Global Settings
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Wall Height (m)</label>
              <input
                type="number"
                min={1}
                max={10}
                step={0.1}
                value={wallHeight}
                onChange={(e) =>
                  setWallHeight(Math.max(1, parseFloat(e.target.value) || 1))
                }
                className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Wall Type</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setWallType("interior")}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    wallType === "interior"
                      ? "bg-accent text-white border-accent"
                      : "bg-surface-alt text-muted border-border hover:border-accent"
                  }`}
                >
                  Interior
                </button>
                <button
                  onClick={() => setWallType("exterior")}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    wallType === "exterior"
                      ? "bg-accent text-white border-accent"
                      : "bg-surface-alt text-muted border-border hover:border-accent"
                  }`}
                >
                  Exterior
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Walls</label>
              <span className="text-sm font-mono tabular-nums">
                {walls.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Openings</label>
              <span className="text-sm font-mono tabular-nums">
                {openings.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Columns</label>
              <span className="text-sm font-mono tabular-nums">
                {columns.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Furniture</label>
              <span className="text-sm font-mono tabular-nums">
                {furniture.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Wireframe</label>
              <button
                onClick={() => setWireframeMode(!wireframeMode)}
                className={`text-xs font-mono px-2 py-0.5 rounded border ${
                  wireframeMode
                    ? "bg-accent text-white border-accent"
                    : "bg-surface-alt text-muted border-border hover:border-accent"
                }`}
              >
                {wireframeMode ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>

        {selectedWall && (
          <>
            <div className="w-full h-px bg-border" />
            <div>
              <h3 className="text-xs font-medium text-muted mb-2">
                Selected Wall
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Length (m)</label>
                  <input
                    type="number"
                    min={0.1}
                    max={50}
                    step={0.05}
                    value={wallLengthMeters(selectedWall, 50).toFixed(2)}
                    onChange={(e) => {
                      const newLen = Math.max(
                        0.1,
                        parseFloat(e.target.value) || 0.1
                      );
                      const { x2, y2 } = wallLengthFromMeters(
                        selectedWall.x1,
                        selectedWall.y1,
                        selectedWall.x2,
                        selectedWall.y2,
                        newLen,
                        50
                      );
                      updateWall(selectedWall.id, { x2, y2 });
                    }}
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Type</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        updateWall(selectedWall.id, {
                          wallType: "interior",
                          thickness: getDefaultThickness("interior"),
                        })
                      }
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        selectedWall.wallType === "interior"
                          ? "bg-accent text-white border-accent"
                          : "bg-surface-alt text-muted border-border hover:border-accent"
                      }`}
                    >
                      Int
                    </button>
                    <button
                      onClick={() =>
                        updateWall(selectedWall.id, {
                          wallType: "exterior",
                          thickness: getDefaultThickness("exterior"),
                        })
                      }
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        selectedWall.wallType === "exterior"
                          ? "bg-accent text-white border-accent"
                          : "bg-surface-alt text-muted border-border hover:border-accent"
                      }`}
                    >
                      Ext
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Height (m)</label>
                  <input
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.1}
                    value={selectedWall.height}
                    onChange={(e) =>
                      updateWall(selectedWall.id, {
                        height:
                          Math.max(0.5, parseFloat(e.target.value) || 0.5),
                      })
                    }
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Thickness (m)</label>
                  <input
                    type="number"
                    min={0.05}
                    max={1}
                    step={0.01}
                    value={selectedWall.thickness}
                    onChange={(e) =>
                      updateWall(selectedWall.id, {
                        thickness:
                          Math.max(0.05, parseFloat(e.target.value) || 0.05),
                      })
                    }
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {selectedOpening && (
          <>
            <div className="w-full h-px bg-border" />
            <div>
              <h3 className="text-xs font-medium text-muted mb-2">
                {selectedOpening.type === "door" ? "Door"
                  : selectedOpening.type === "sliding_door" ? "Sliding Door"
                  : "Window"}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Type</label>
                  <span className="text-sm font-mono tabular-nums capitalize">
                    {selectedOpening.type.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Width (m)</label>
                  <input
                    type="number"
                    min={0.3}
                    max={3}
                    step={0.05}
                    value={selectedOpening.width}
                    onChange={(e) =>
                      updateOpening(selectedOpening.id, {
                        width:
                          Math.max(0.3, parseFloat(e.target.value) || 0.3),
                      })
                    }
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Height (m)</label>
                  <input
                    type="number"
                    min={0.3}
                    max={5}
                    step={0.05}
                    value={selectedOpening.height}
                    onChange={(e) =>
                      updateOpening(selectedOpening.id, {
                        height:
                          Math.max(0.3, parseFloat(e.target.value) || 0.3),
                      })
                    }
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Position (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(selectedOpening.position * 100)}
                    onChange={(e) =>
                      updateOpening(selectedOpening.id, {
                        position:
                          Math.max(
                            0,
                            Math.min(
                              1,
                              (parseFloat(e.target.value) || 0) / 100
                            )
                          ),
                      })
                    }
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
                {selectedOpening.type === "window" && (
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-muted">Sill (m)</label>
                    <input
                      type="number"
                      min={0}
                      max={2}
                      step={0.05}
                      value={selectedOpening.sillHeight}
                      onChange={(e) =>
                        updateOpening(selectedOpening.id, {
                          sillHeight:
                            Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                      className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                    />
                  </div>
                )}
                <button
                  onClick={() => deleteOpening(selectedOpening.id)}
                  className="w-full text-xs text-red-400 border border-red-400/30 rounded px-2 py-1 hover:bg-red-400/10 mt-2"
                >
                  Delete {selectedOpening.type === "door" ? "Door"
                    : selectedOpening.type === "sliding_door" ? "Sliding Door"
                    : "Window"}
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
                Structural Column
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Width (m)</label>
                  <input
                    type="number"
                    min={0.1}
                    max={2}
                    step={0.05}
                    value={selectedColumn.width}
                    onChange={(e) =>
                      updateColumn(selectedColumn.id, {
                        width: Math.max(0.1, parseFloat(e.target.value) || 0.1),
                      })
                    }
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Depth (m)</label>
                  <input
                    type="number"
                    min={0.1}
                    max={2}
                    step={0.05}
                    value={selectedColumn.depth}
                    onChange={(e) =>
                      updateColumn(selectedColumn.id, {
                        depth: Math.max(0.1, parseFloat(e.target.value) || 0.1),
                      })
                    }
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Height (m)</label>
                  <input
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.1}
                    value={selectedColumn.height}
                    onChange={(e) =>
                      updateColumn(selectedColumn.id, {
                        height: Math.max(0.5, parseFloat(e.target.value) || 0.5),
                      })
                    }
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <button
                  onClick={() => {
                    const state = useEditorStore.getState();
                    state.deleteColumn(selectedColumn.id);
                    state.clearSelection();
                  }}
                  className="w-full text-xs text-red-400 border border-red-400/30 rounded px-2 py-1 hover:bg-red-400/10 mt-2"
                >
                  Delete Column
                </button>
              </div>
            </div>
          </>
        )}

        {selectedLabel && (
          <>
            <div className="w-full h-px bg-border" />
            <div>
              <h3 className="text-xs font-medium text-muted mb-2">
                Room Label
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Text</label>
                  <input
                    type="text"
                    value={selectedLabel.text}
                    onChange={(e) =>
                      updateLabel(selectedLabel.id, { text: e.target.value })
                    }
                    className="w-32 text-right text-sm font-mono bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Rotation</label>
                  <input
                    type="number"
                    min={0}
                    max={360}
                    step={90}
                    value={selectedLabel.rotation}
                    onChange={(e) =>
                      updateLabel(selectedLabel.id, {
                        rotation: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <button
                  onClick={() => {
                    const state = useEditorStore.getState();
                    state.deleteLabel(selectedLabel.id);
                    state.clearSelection();
                  }}
                  className="w-full text-xs text-red-400 border border-red-400/30 rounded px-2 py-1 hover:bg-red-400/10 mt-2"
                >
                  Delete Label
                </button>
              </div>
            </div>
          </>
        )}

        {selectedFurniture && (
          <>
            <div className="w-full h-px bg-border" />
            <div>
              <h3 className="text-xs font-medium text-muted mb-2">
                {selectedFurniture.name}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Width (m)</label>
                  <input
                    type="number"
                    min={0.1}
                    max={10}
                    step={0.05}
                    value={selectedFurniture.width}
                    onChange={(e) =>
                      updateFurniture(selectedFurniture.id, {
                        width: Math.max(0.1, parseFloat(e.target.value) || 0.1),
                      })
                    }
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Depth (m)</label>
                  <input
                    type="number"
                    min={0.1}
                    max={10}
                    step={0.05}
                    value={selectedFurniture.height}
                    onChange={(e) =>
                      updateFurniture(selectedFurniture.id, {
                        height: Math.max(0.1, parseFloat(e.target.value) || 0.1),
                      })
                    }
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Elevation (m)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.05}
                    value={selectedFurniture.elevation}
                    onChange={(e) =>
                      updateFurniture(selectedFurniture.id, {
                        elevation: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Rotation</label>
                  <span className="text-sm font-mono tabular-nums">
                    {selectedFurniture.rotation}&deg;
                  </span>
                </div>
                <div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={selectedFurniture.rotation}
                    onChange={(e) =>
                      updateFurniture(selectedFurniture.id, {
                        rotation: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-accent"
                  />
                  <div className="flex justify-between text-[9px] text-muted/50 font-mono mt-0.5">
                    <span>0&deg;</span>
                    <span>180&deg;</span>
                    <span>360&deg;</span>
                  </div>
                </div>
                <button
                  onClick={() =>
                    updateFurniture(selectedFurniture.id, {
                      rotation: (selectedFurniture.rotation + 90) % 360,
                    })
                  }
                  className="w-full text-xs text-accent border border-accent/30 rounded px-2 py-1 hover:bg-accent/10 mt-1"
                >
                  Rotate 90&deg;
                </button>
                <button
                  onClick={() => {
                    const state = useEditorStore.getState();
                    state.deleteFurniture(selectedFurniture.id);
                    state.clearSelection();
                  }}
                  className="w-full text-xs text-red-400 border border-red-400/30 rounded px-2 py-1 hover:bg-red-400/10 mt-1"
                >
                  Delete
                </button>
              </div>
            </div>
          </>
        )}

        {!selectedWall && !selectedOpening && !selectedColumn && !selectedLabel && !selectedFurniture && (
          <p className="text-xs text-muted/50 text-center pt-2">
            Select an element to edit its properties
          </p>
        )}
      </div>
    </aside>
  );
}
