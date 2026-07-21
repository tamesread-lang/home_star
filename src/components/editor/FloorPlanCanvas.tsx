"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Stage, Layer, Line, Circle, Text, Group } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEditorStore } from "@/store/editor-store";
import type { Point, Wall } from "@/types/editor";

const GRID_SIZE = 50;
const SNAP_DISTANCE = 10;
const WALL_WIDTH = 8;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const dot = apx * abx + apy * aby;
  const len2 = abx * abx + aby * aby;
  let t = len2 !== 0 ? dot / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  return distance(p, { x: cx, y: cy });
}

let wallIdCounter = 0;
function generateWallId(): string {
  wallIdCounter += 1;
  return `wall_${wallIdCounter}_${Date.now()}`;
}

export default function FloorPlanCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [drawingStart, setDrawingStart] = useState<Point | null>(null);
  const [drawingEnd, setDrawingEnd] = useState<Point | null>(null);
  const isDrawingRef = useRef(false);

  const walls = useEditorStore((s) => s.walls);
  const activeTool = useEditorStore((s) => s.activeTool);
  const gridVisible = useEditorStore((s) => s.gridVisible);
  const selectedWallId = useEditorStore((s) => s.selectedWallId);
  const addWall = useEditorStore((s) => s.addWall);
  const deleteWall = useEditorStore((s) => s.deleteWall);
  const selectWall = useEditorStore((s) => s.selectWall);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => e.preventDefault();
    container.addEventListener("wheel", handleWheel, { passive: false });

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      observer.disconnect();
    };
  }, []);

  const getStagePos = useCallback(
    (e: KonvaEventObject<MouseEvent>): Point => ({
      x: e.evt.clientX - (containerRef.current?.getBoundingClientRect().left ?? 0),
      y: e.evt.clientY - (containerRef.current?.getBoundingClientRect().top ?? 0),
    }),
    []
  );

  const getWallAtPoint = useCallback(
    (pos: Point): Wall | null => {
      const threshold = 8;
      for (let i = walls.length - 1; i >= 0; i--) {
        const w = walls[i];
        const d = pointToSegmentDistance(pos, w.start, w.end);
        if (d < threshold) return w;
      }
      return null;
    },
    [walls]
  );

  const snapPoint = useCallback(
    (pos: Point, snapToExisting: boolean = true): Point => {
      let snapped = { x: snapToGrid(pos.x), y: snapToGrid(pos.y) };

      if (snapToExisting && activeTool === "wall") {
        for (const w of walls) {
          if (distance(pos, w.start) < SNAP_DISTANCE) {
            snapped = w.start;
          } else if (distance(pos, w.end) < SNAP_DISTANCE) {
            snapped = w.end;
          }
        }
      }

      return snapped;
    },
    [walls, activeTool]
  );

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const pos = getStagePos(e);

      if (activeTool === "wall") {
        const snapped = snapPoint(pos, true);
        if (!drawingStart) {
          setDrawingStart(snapped);
          setDrawingEnd(snapped);
          isDrawingRef.current = true;
        } else {
          if (distance(drawingStart, snapped) > 5) {
            addWall({
              id: generateWallId(),
              start: drawingStart,
              end: snapped,
              width: 0.15,
              height: 3,
            });
          }
          setDrawingStart(null);
          setDrawingEnd(null);
          isDrawingRef.current = false;
        }
      } else if (activeTool === "select") {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          selectWall(clickedWall.id);
        } else {
          clearSelection();
        }
      } else if (activeTool === "eraser") {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          deleteWall(clickedWall.id);
        }
      }
    },
    [activeTool, drawingStart, getStagePos, snapPoint, addWall, selectWall, clearSelection, deleteWall, getWallAtPoint]
  );

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const pos = getStagePos(e);

      if (isDrawingRef.current) {
        setDrawingEnd(snapPoint(pos, true));
      }
    },
    [getStagePos, snapPoint]
  );

  const handleMouseUp = useCallback(() => {
    if (activeTool === "wall" && isDrawingRef.current && drawingStart) {
      const snapped = drawingEnd || drawingStart;
      if (distance(drawingStart, snapped) > 5) {
        addWall({
          id: generateWallId(),
          start: drawingStart,
          end: snapped,
          width: 0.15,
          height: 3,
        });
      }
      setDrawingStart(null);
      setDrawingEnd(null);
      isDrawingRef.current = false;
    }
  }, [activeTool, drawingStart, drawingEnd, addWall]);

  const gridLines: { x: number; y: number; w: number; h: number }[] = [];
  if (gridVisible) {
    for (let x = 0; x < dimensions.width; x += GRID_SIZE) {
      gridLines.push({ x, y: 0, w: 1, h: dimensions.height });
    }
    for (let y = 0; y < dimensions.height; y += GRID_SIZE) {
      gridLines.push({ x: 0, y, w: dimensions.width, h: 1 });
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1 bg-[#0f0f23] overflow-hidden">
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e: KonvaEventObject<PointerEvent>) => {
          e.evt.preventDefault();
          if (isDrawingRef.current) {
            setDrawingStart(null);
            setDrawingEnd(null);
            isDrawingRef.current = false;
          }
        }}
      >
        <Layer>
          {gridLines.map((line, i) => (
            <Line
              key={`grid-${i}`}
              points={
                line.w === 1
                  ? [line.x, line.y, line.x, line.y + line.h]
                  : [line.x, line.y, line.x + line.w, line.y]
              }
              stroke="#1a1a3e"
              strokeWidth={1}
            />
          ))}
        </Layer>

        <Layer>
          {walls.map((wall) => {
            const isSelected = wall.id === selectedWallId;
            return (
              <Group key={wall.id}>
                <Line
                  points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
                  stroke={isSelected ? "#4a7cff" : "#6b7280"}
                  strokeWidth={isSelected ? WALL_WIDTH + 2 : WALL_WIDTH}
                  lineCap="round"
                  lineJoin="round"
                />
                {isSelected && (
                  <>
                    <Circle
                      x={wall.start.x}
                      y={wall.start.y}
                      radius={5}
                      fill="#4a7cff"
                    />
                    <Circle
                      x={wall.end.x}
                      y={wall.end.y}
                      radius={5}
                      fill="#4a7cff"
                    />
                  </>
                )}
              </Group>
            );
          })}
        </Layer>

        <Layer>
          {activeTool === "dimension" &&
            walls.map((wall) => {
              const midX = (wall.start.x + wall.end.x) / 2;
              const midY = (wall.start.y + wall.end.y) / 2;
              const len = distance(wall.start, wall.end);
              const meters = ((len / GRID_SIZE) * 1).toFixed(2);
              return (
                <Text
                  key={`dim-${wall.id}`}
                  x={midX - 15}
                  y={midY - 10}
                  text={`${meters}m`}
                  fontSize={11}
                  fill="#4a7cff"
                  fontFamily="monospace"
                />
              );
            })}
        </Layer>

        <Layer>
          {drawingStart && drawingEnd && activeTool === "wall" && (
            <Line
              points={[drawingStart.x, drawingStart.y, drawingEnd.x, drawingEnd.y]}
              stroke="#4a7cff"
              strokeWidth={WALL_WIDTH}
              dash={[5, 5]}
              lineCap="round"
            />
          )}
        </Layer>
      </Stage>

      {walls.length === 0 && !drawingStart && (
        <div className="absolute inset-4 border border-dashed border-border rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-muted text-sm">2D Floor Plan Canvas</p>
            <p className="text-muted/50 text-xs mt-1">
              {activeTool === "wall"
                ? "Click to start drawing a wall"
                : "Select the Wall tool (W) to start drawing"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
