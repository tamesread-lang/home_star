"use client";

import { useEditorStore } from "@/store/editor-store";
import { useMemo } from "react";
import { wallLengthMeters } from "@/types/editor";

export default function InspectorPanel() {
  const walls = useEditorStore((s) => s.walls);
  const selectedWallId = useEditorStore((s) => s.selectedWallId);
  const landWidth = useEditorStore((s) => s.landWidth);
  const landLength = useEditorStore((s) => s.landLength);
  const setLandWidth = useEditorStore((s) => s.setLandWidth);
  const setLandLength = useEditorStore((s) => s.setLandLength);
  const updateWall = useEditorStore((s) => s.updateWall);

  const selectedWall = useMemo(
    () => walls.find((w) => w.id === selectedWallId) ?? null,
    [walls, selectedWallId]
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
                onChange={(e) => setLandWidth(Math.max(1, parseFloat(e.target.value) || 1))}
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
                onChange={(e) => setLandLength(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
              />
            </div>
            <div className="w-full h-px bg-border" />
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Total Area</label>
              <span className="text-sm font-mono tabular-nums font-semibold text-accent">
                {totalArea} m²
              </span>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Walls</label>
              <span className="text-sm font-mono tabular-nums">{walls.length}</span>
            </div>
          </div>
        </div>

        {selectedWall && (
          <div>
            <div className="w-full h-px bg-border my-4" />
            <h3 className="text-xs font-medium text-muted mb-2">Selected Wall</h3>
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
                      height: Math.max(0.5, parseFloat(e.target.value) || 0.5),
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
                      thickness: Math.max(0.05, parseFloat(e.target.value) || 0.05),
                    })
                  }
                  className="w-20 text-right text-sm font-mono tabular-nums bg-surface-alt border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
