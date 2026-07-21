"use client";

import { useEditorStore } from "@/store/editor-store";
import { useMemo } from "react";
import { wallLengthMeters, openingPositionOnWall } from "@/types/editor";

export default function InspectorPanel() {
  const walls = useEditorStore((s) => s.walls);
  const openings = useEditorStore((s) => s.openings);
  const selectedWallId = useEditorStore((s) => s.selectedWallId);
  const selectedOpeningId = useEditorStore((s) => s.selectedOpeningId);
  const landWidth = useEditorStore((s) => s.landWidth);
  const landLength = useEditorStore((s) => s.landLength);
  const wallHeight = useEditorStore((s) => s.wallHeight);
  const wireframeMode = useEditorStore((s) => s.wireframeMode);
  const setLandWidth = useEditorStore((s) => s.setLandWidth);
  const setLandLength = useEditorStore((s) => s.setLandLength);
  const setWallHeight = useEditorStore((s) => s.setWallHeight);
  const setWireframeMode = useEditorStore((s) => s.setWireframeMode);
  const updateWall = useEditorStore((s) => s.updateWall);
  const updateOpening = useEditorStore((s) => s.updateOpening);
  const deleteOpening = useEditorStore((s) => s.deleteOpening);

  const selectedWall = useMemo(
    () => walls.find((w) => w.id === selectedWallId) ?? null,
    [walls, selectedWallId]
  );

  const selectedOpening = useMemo(
    () => openings.find((o) => o.id === selectedOpeningId) ?? null,
    [openings, selectedOpeningId]
  );

  const totalArea = (landWidth * landLength).toFixed(2);

  return (
    <aside className="w-60 border-l border-border bg-surface p-4 shrink-0 overflow-y-auto">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
        Properties
      </h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-medium text-muted mb-2">Land Dimensions</h3>
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
          <h3 className="text-xs font-medium text-muted mb-2">Global Settings</h3>
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
                  <label className="text-sm text-muted">Length</label>
                  <span className="text-sm font-mono tabular-nums">
                    {wallLengthMeters(selectedWall, 50).toFixed(2)} m
                  </span>
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
                    step={0.05}
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
                {selectedOpening.type === "door" ? "Door" : "Window"}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Type</label>
                  <span className="text-sm font-mono tabular-nums capitalize">
                    {selectedOpening.type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted">Width (m)</label>
                  <input
                    type="number"
                    min={0.3}
                    max={3}
                    step={0.1}
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
                    step={0.1}
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
                  <label className="text-sm text-muted">Position</label>
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
                      step={0.1}
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
                  Delete {selectedOpening.type === "door" ? "Door" : "Window"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
