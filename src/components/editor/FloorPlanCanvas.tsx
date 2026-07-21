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
  const landWidth = useEditorStore((s) => s.landWidth);
  const landLength = useEditorStore((s) => s.landLength);
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
        const d = pointToSegmentDistance(pos, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
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
          const startP = { x: w.x1, y: w.y1 };
          const endP = { x: w.x2, y: w.y2 };
          if (distance(pos, startP) < SNAP_DISTANCE) {
            snapped = startP;
          } else if (distance(pos, endP) < SNAP_DISTANCE) {
            snapped = endP;
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
              x1: drawingStart.x,
              y1: drawingStart.y,
              x2: snapped.x,
              y2: snapped.y,
              thickness: 0.15,
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
          x1: drawingStart.x,
          y1: drawingStart.y,
          x2: snapped.x,
          y2: snapped.y,
          thickness: 0.15,
          height: 3,
        });
      }
      setDrawingStart(null);
      setDrawingEnd(null);
      isDrawingRef.current = false;
    }
  }, [activeTool, drawingStart, drawingEnd, addWall]);

  const landBoundX = GRID_SIZE;
  const landBoundY = GRID_SIZE;
  const landBoundW = landWidth * GRID_SIZE;
  const landBoundH = landLength * GRID_SIZE;

  const minorGridLines: { x: number; y: number; w: number; h: number }[] = [];
  const majorGridLines: { x: number; y: number; w: number; h: number }[] = [];
  if (gridVisible) {
    for (let x = 0; x < dimensions.width; x += GRID_SIZE) {
      const arr = (x / GRID_SIZE) % 5 === 0 ? majorGridLines : minorGridLines;
      arr.push({ x, y: 0, w: 1, h: dimensions.height });
    }
    for (let y = 0; y < dimensions.height; y += GRID_SIZE) {
      const arr = (y / GRID_SIZE) % 5 === 0 ? majorGridLines : minorGridLines;
      arr.push({ x: 0, y, w: dimensions.width, h: 1 });
    }
  }

  function renderGridLines(
    lines: { x: number; y: number; w: number; h: number }[],
    stroke: string,
    strokeWidth: number
  ) {
    return lines.map((line, i) => (
      <Line
        key={`${stroke}-${i}`}
        points={
          line.w === 1
            ? [line.x, line.y, line.x, line.y + line.h]
            : [line.x, line.y, line.x + line.w, line.y]
        }
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    ));
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
          {renderGridLines(minorGridLines, "#1a1a3e", 0.5)}
          {renderGridLines(majorGridLines, "#2a2a5e", 1)}
        </Layer>

        <Layer>
          <Line
            points={[
              landBoundX, landBoundY,
              landBoundX + landBoundW, landBoundY,
              landBoundX + landBoundW, landBoundY + landBoundH,
              landBoundX, landBoundY + landBoundH,
              landBoundX, landBoundY,
            ]}
            stroke="#4a7cff"
            strokeWidth={2}
          />
          <Text
            x={landBoundX + landBoundW / 2 - 30}
            y={landBoundY - 18}
            text={`${landWidth}m`}
            fontSize={10}
            fill="#4a7cff"
            fontFamily="monospace"
          />
          <Text
            x={landBoundX - 28}
            y={landBoundY + landBoundH / 2 - 6}
            text={`${landLength}m`}
            fontSize={10}
            fill="#4a7cff"
            fontFamily="monospace"
          />
        </Layer>

        <Layer>
          {walls.map((wall) => {
            const isSelected = wall.id === selectedWallId;
            const midX = (wall.x1 + wall.x2) / 2;
            const midY = (wall.y1 + wall.y2) / 2;
            const dx = wall.x2 - wall.x1;
            const dy = wall.y2 - wall.y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const meters = (len / GRID_SIZE).toFixed(2);
            const labelOffset = 12;
            const nx = midX + labelOffset;
            const ny = midY - labelOffset;

            return (
              <Group key={wall.id}>
                <Line
                  points={[wall.x1, wall.y1, wall.x2, wall.y2]}
                  stroke={isSelected ? "#4a7cff" : "#6b7280"}
                  strokeWidth={isSelected ? WALL_WIDTH + 2 : WALL_WIDTH}
                  lineCap="round"
                  lineJoin="round"
                />
                <Text
                  x={nx - 20}
                  y={ny - 8}
                  text={`${meters} m`}
                  fontSize={10}
                  fill={isSelected ? "#4a7cff" : "#9ca3af"}
                  fontFamily="monospace"
                />
                {isSelected && (
                  <>
                    <Circle
                      x={wall.x1}
                      y={wall.y1}
                      radius={5}
                      fill="#4a7cff"
                    />
                    <Circle
                      x={wall.x2}
                      y={wall.y2}
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
          {drawingStart && drawingEnd && activeTool === "wall" && (
            <>
              <Line
                points={[drawingStart.x, drawingStart.y, drawingEnd.x, drawingEnd.y]}
                stroke="#4a7cff"
                strokeWidth={WALL_WIDTH}
                dash={[5, 5]}
                lineCap="round"
              />
              <Text
                x={(drawingStart.x + drawingEnd.x) / 2 - 20}
                y={(drawingStart.y + drawingEnd.y) / 2 - 12}
                text={`${(distance(drawingStart, drawingEnd) / GRID_SIZE).toFixed(2)} m`}
                fontSize={10}
                fill="#4a7cff"
                fontFamily="monospace"
              />
            </>
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
