"use client";

import { useEditorStore } from "@/store/editor-store";
import { useMemo } from "react";

const GRID_SIZE = 50;

export default function InspectorPanel() {
  const walls = useEditorStore((s) => s.walls);
  const selectedWallId = useEditorStore((s) => s.selectedWallId);

  const selectedWall = useMemo(
    () => walls.find((w) => w.id === selectedWallId) ?? null,
    [walls, selectedWallId]
  );

  const totalArea = useMemo(() => {
    if (walls.length === 0) return 0;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const wall of walls) {
      minX = Math.min(minX, wall.start.x, wall.end.x);
      maxX = Math.max(maxX, wall.start.x, wall.end.x);
      minY = Math.min(minY, wall.start.y, wall.end.y);
      maxY = Math.max(maxY, wall.start.y, wall.end.y);
    }
    const widthM = ((maxX - minX) / GRID_SIZE);
    const heightM = ((maxY - minY) / GRID_SIZE);
    return (widthM * heightM).toFixed(2);
  }, [walls]);

  const landWidth = useMemo(() => {
    if (walls.length === 0) return "12.00";
    let minX = Infinity, maxX = -Infinity;
    for (const wall of walls) {
      minX = Math.min(minX, wall.start.x, wall.end.x);
      maxX = Math.max(maxX, wall.start.x, wall.end.x);
    }
    return ((maxX - minX) / GRID_SIZE).toFixed(2);
  }, [walls]);

  const landLength = useMemo(() => {
    if (walls.length === 0) return "10.00";
    let minY = Infinity, maxY = -Infinity;
    for (const wall of walls) {
      minY = Math.min(minY, wall.start.y, wall.end.y);
      maxY = Math.max(maxY, wall.start.y, wall.end.y);
    }
    return ((maxY - minY) / GRID_SIZE).toFixed(2);
  }, [walls]);

  function wallLength(wall: { start: { x: number; y: number }; end: { x: number; y: number } }): string {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    return (Math.sqrt(dx * dx + dy * dy) / GRID_SIZE).toFixed(2);
  }

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
              <label className="text-sm text-muted">Width</label>
              <span className="text-sm font-mono tabular-nums">{landWidth} m</span>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Length</label>
              <span className="text-sm font-mono tabular-nums">{landLength} m</span>
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
                <span className="text-sm font-mono tabular-nums">{wallLength(selectedWall)} m</span>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted">Height</label>
                <span className="text-sm font-mono tabular-nums">{selectedWall.height.toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted">Thickness</label>
                <span className="text-sm font-mono tabular-nums">{selectedWall.width.toFixed(2)} m</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
