"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Stage, Layer, Line, Circle, Text, Group, Rect, Arc } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEditorStore } from "@/store/editor-store";
import type { Point, Wall, Opening, FurnitureItem } from "@/types/editor";
import {
  openingPositionOnWall,
  getDefaultThickness,
  FURNITURE_CATALOG,
} from "@/types/editor";

const GRID_SIZE = 50;
const SNAP_DISTANCE = 10;
const WALL_WIDTH = 8;

function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
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
  return distance(p, { x: a.x + t * abx, y: a.y + t * aby });
}

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Date.now()}`;
}

export default function FloorPlanCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [drawingStart, setDrawingStart] = useState<Point | null>(null);
  const [drawingEnd, setDrawingEnd] = useState<Point | null>(null);
  const [stageOffset, setStageOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const isDrawingRef = useRef(false);

  const walls = useEditorStore((s) => s.walls);
  const openings = useEditorStore((s) => s.openings);
  const furniture = useEditorStore((s) => s.furniture);
  const activeTool = useEditorStore((s) => s.activeTool);
  const gridVisible = useEditorStore((s) => s.gridVisible);
  const snapSize = useEditorStore((s) => s.snapSize);
  const selectedWallId = useEditorStore((s) => s.selectedWallId);
  const selectedOpeningId = useEditorStore((s) => s.selectedOpeningId);
  const selectedFurnitureId = useEditorStore((s) => s.selectedFurnitureId);
  const landWidth = useEditorStore((s) => s.landWidth);
  const landLength = useEditorStore((s) => s.landLength);
  const wallHeight = useEditorStore((s) => s.wallHeight);
  const wallType = useEditorStore((s) => s.wallType);
  const measurePoints = useEditorStore((s) => s.measurePoints);
  const activeFurnitureTemplate = useEditorStore((s) => s.activeFurnitureTemplate);

  const addWall = useEditorStore((s) => s.addWall);
  const deleteWall = useEditorStore((s) => s.deleteWall);
  const selectWall = useEditorStore((s) => s.selectWall);
  const selectOpening = useEditorStore((s) => s.selectOpening);
  const selectFurniture = useEditorStore((s) => s.selectFurniture);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const addOpening = useEditorStore((s) => s.addOpening);
  const addMeasurePoint = useEditorStore((s) => s.addMeasurePoint);
  const clearMeasurePoints = useEditorStore((s) => s.clearMeasurePoints);
  const addFurniture = useEditorStore((s) => s.addFurniture);
  const setActiveFurnitureTemplate = useEditorStore(
    (s) => s.setActiveFurnitureTemplate
  );

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
    (e: KonvaEventObject<MouseEvent>): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      return {
        x: e.evt.clientX - (rect?.left ?? 0) - stageOffset.x,
        y: e.evt.clientY - (rect?.top ?? 0) - stageOffset.y,
      };
    },
    [stageOffset]
  );

  const getWallAtPoint = useCallback(
    (pos: Point): Wall | null => {
      const threshold = 8;
      for (let i = walls.length - 1; i >= 0; i--) {
        const w = walls[i];
        if (
          pointToSegmentDistance(
            pos,
            { x: w.x1, y: w.y1 },
            { x: w.x2, y: w.y2 }
          ) < threshold
        )
          return w;
      }
      return null;
    },
    [walls]
  );

  const getFurnitureAtPoint = useCallback(
    (pos: Point): FurnitureItem | null => {
      for (let i = furniture.length - 1; i >= 0; i--) {
        const f = furniture[i];
        const hw = (f.width * GRID_SIZE) / 2;
        const hh = (f.height * GRID_SIZE) / 2;
        if (
          pos.x >= f.x - hw &&
          pos.x <= f.x + hw &&
          pos.y >= f.y - hh &&
          pos.y <= f.y + hh
        )
          return f;
      }
      return null;
    },
    [furniture]
  );

  const snapPoint = useCallback(
    (pos: Point, snapToExisting: boolean = true): Point => {
      let snapped = {
        x: snapSize > 0 ? snapToGrid(pos.x, snapSize) : pos.x,
        y: snapSize > 0 ? snapToGrid(pos.y, snapSize) : pos.y,
      };

      if (snapToExisting && (activeTool === "wall" || activeTool === "room")) {
        for (const w of walls) {
          const sp = { x: w.x1, y: w.y1 };
          const ep = { x: w.x2, y: w.y2 };
          if (distance(pos, sp) < SNAP_DISTANCE) snapped = sp;
          else if (distance(pos, ep) < SNAP_DISTANCE) snapped = ep;
        }
      }
      return snapped;
    },
    [walls, activeTool, snapSize]
  );

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const pos = getStagePos(e);

      if (activeTool === "pan") {
        setIsPanning(true);
        panStartRef.current = {
          x: e.evt.clientX,
          y: e.evt.clientY,
          sx: stageOffset.x,
          sy: stageOffset.y,
        };
        return;
      }

      if (activeTool === "wall") {
        const snapped = snapPoint(pos, true);
        if (!drawingStart) {
          setDrawingStart(snapped);
          setDrawingEnd(snapped);
          isDrawingRef.current = true;
        } else {
          if (distance(drawingStart, snapped) > 5) {
            addWall({
              id: genId("wall"),
              x1: drawingStart.x,
              y1: drawingStart.y,
              x2: snapped.x,
              y2: snapped.y,
              thickness: getDefaultThickness(wallType),
              height: wallHeight,
              wallType,
            });
          }
          setDrawingStart(null);
          setDrawingEnd(null);
          isDrawingRef.current = false;
        }
        return;
      }

      if (activeTool === "room") {
        const snapped = snapPoint(pos, true);
        if (!drawingStart) {
          setDrawingStart(snapped);
          setDrawingEnd(snapped);
          isDrawingRef.current = true;
        } else {
          if (distance(drawingStart, snapped) > 10) {
            const { x: x1, y: y1 } = drawingStart;
            const { x: x2, y: y2 } = snapped;
            const t = getDefaultThickness(wallType);
            addWall({
              id: genId("wall"), x1, y1, x2: x2, y2: y1, thickness: t, height: wallHeight, wallType,
            });
            addWall({
              id: genId("wall"), x1: x2, y1, x2, y2, thickness: t, height: wallHeight, wallType,
            });
            addWall({
              id: genId("wall"), x1: x2, y1: y2, x2: x1, y2, thickness: t, height: wallHeight, wallType,
            });
            addWall({
              id: genId("wall"), x1, y1: y2, x2: x1, y2: y1, thickness: t, height: wallHeight, wallType,
            });
          }
          setDrawingStart(null);
          setDrawingEnd(null);
          isDrawingRef.current = false;
        }
        return;
      }

      if (activeTool === "measure") {
        const snapped = snapSize > 0 ? snapPoint(pos, false) : pos;
        addMeasurePoint(snapped);
        return;
      }

      if (activeTool === "select") {
        const clickedFurniture = getFurnitureAtPoint(pos);
        if (clickedFurniture) {
          selectFurniture(clickedFurniture.id);
          return;
        }
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          selectWall(clickedWall.id);
        } else {
          clearSelection();
        }
        return;
      }

      if (activeTool === "door" || activeTool === "window") {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          const t = openingPositionOnWall(clickedWall, pos.x, pos.y);
          const isDoor = activeTool === "door";
          addOpening({
            id: genId("open"),
            wallId: clickedWall.id,
            type: isDoor ? "door" : "window",
            position: t,
            width: isDoor ? 0.9 : 1.2,
            height: isDoor ? 2.1 : 1.2,
            sillHeight: isDoor ? 0 : 0.9,
          });
        }
        return;
      }

      if (activeTool === "eraser") {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          deleteWall(clickedWall.id);
        }
        return;
      }

      if (activeFurnitureTemplate) {
        addFurniture({
          id: genId("furn"),
          name: activeFurnitureTemplate.name,
          category: "",
          x: pos.x,
          y: pos.y,
          width: activeFurnitureTemplate.width,
          height: activeFurnitureTemplate.height,
          rotation: 0,
        });
        setActiveFurnitureTemplate(null);
        return;
      }
    },
    [
      activeTool, drawingStart, getStagePos, snapPoint, addWall, selectWall,
      clearSelection, deleteWall, getWallAtPoint, addOpening, addMeasurePoint,
      wallHeight, wallType, snapSize, stageOffset, getFurnitureAtPoint,
      selectFurniture, activeFurnitureTemplate, addFurniture, setActiveFurnitureTemplate,
    ]
  );

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (activeTool === "pan" && isPanning) {
        const dx = e.evt.clientX - panStartRef.current.x;
        const dy = e.evt.clientY - panStartRef.current.y;
        setStageOffset({
          x: panStartRef.current.sx + dx,
          y: panStartRef.current.sy + dy,
        });
        return;
      }

      const pos = getStagePos(e);

      if (isDrawingRef.current && (activeTool === "wall" || activeTool === "room")) {
        setDrawingEnd(snapPoint(pos, true));
      }
    },
    [activeTool, isPanning, getStagePos, snapPoint, stageOffset]
  );

  const handleMouseUp = useCallback(() => {
    if (activeTool === "pan" && isPanning) {
      setIsPanning(false);
      return;
    }

    if (
      (activeTool === "wall" || activeTool === "room") &&
      isDrawingRef.current &&
      drawingStart
    ) {
      const snapped = drawingEnd || drawingStart;
      if (activeTool === "wall" && distance(drawingStart, snapped) > 5) {
        addWall({
          id: genId("wall"),
          x1: drawingStart.x,
          y1: drawingStart.y,
          x2: snapped.x,
          y2: snapped.y,
          thickness: getDefaultThickness(wallType),
          height: wallHeight,
          wallType,
        });
      }
      setDrawingStart(null);
      setDrawingEnd(null);
      isDrawingRef.current = false;
    }
  }, [activeTool, isPanning, drawingStart, drawingEnd, addWall, wallHeight, wallType]);

  const landBoundX = GRID_SIZE;
  const landBoundY = GRID_SIZE;
  const landBoundW = landWidth * GRID_SIZE;
  const landBoundH = landLength * GRID_SIZE;

  const gridStep = snapSize > 0 ? snapSize : GRID_SIZE;
  const minorGridLines: { x: number; y: number; w: number; h: number }[] = [];
  const majorGridLines: { x: number; y: number; w: number; h: number }[] = [];
  if (gridVisible) {
    for (let x = 0; x < dimensions.width; x += gridStep) {
      const arr = (x / gridStep) % 5 === 0 ? majorGridLines : minorGridLines;
      arr.push({ x, y: 0, w: 1, h: dimensions.height });
    }
    for (let y = 0; y < dimensions.height; y += gridStep) {
      const arr = (y / gridStep) % 5 === 0 ? majorGridLines : minorGridLines;
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
    <div
      ref={containerRef}
      className="relative flex-1 bg-[#0f0f23] overflow-hidden"
    >
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        x={stageOffset.x}
        y={stageOffset.y}
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
            const isExterior = wall.wallType === "exterior";
            const sw = isSelected
              ? WALL_WIDTH + 4
              : isExterior
              ? WALL_WIDTH + 3
              : WALL_WIDTH;
            const nx = midX + 12;
            const ny = midY - 12;

            return (
              <Group key={wall.id}>
                <Line
                  points={[wall.x1, wall.y1, wall.x2, wall.y2]}
                  stroke={isSelected ? "#4a7cff" : isExterior ? "#8899bb" : "#6b7280"}
                  strokeWidth={sw}
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
                    <Circle x={wall.x1} y={wall.y1} radius={5} fill="#4a7cff" />
                    <Circle x={wall.x2} y={wall.y2} radius={5} fill="#4a7cff" />
                  </>
                )}
              </Group>
            );
          })}
        </Layer>

        <Layer>
          {openings.map((opening) => {
            const parentWall = walls.find((w) => w.id === opening.wallId);
            if (!parentWall) return null;
            const px =
              parentWall.x1 +
              opening.position * (parentWall.x2 - parentWall.x1);
            const py =
              parentWall.y1 +
              opening.position * (parentWall.y2 - parentWall.y1);
            const dx = parentWall.x2 - parentWall.x1;
            const dy = parentWall.y2 - parentWall.y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 1) return null;
            const nx = -dy / len;
            const ny = dx / len;
            const halfW = (opening.width * GRID_SIZE) / 2;
            const perpLen = opening.type === "door" ? 15 : 10;
            const isSelected = opening.id === selectedOpeningId;
            const color = isSelected
              ? "#4a7cff"
              : opening.type === "door"
              ? "#e8a87c"
              : "#7cc8e8";

            return (
              <Group key={opening.id}>
                {opening.type === "door" ? (
                  <>
                    <Line
                      points={[
                        px - halfW * (dx / len),
                        py - halfW * (dy / len),
                        px + halfW * (dx / len),
                        py + halfW * (dy / len),
                      ]}
                      stroke={color}
                      strokeWidth={2}
                    />
                    <Line
                      points={[
                        px + halfW * (dx / len),
                        py + halfW * (dy / len),
                        px + halfW * (dx / len) + nx * perpLen,
                        py + halfW * (dy / len) + ny * perpLen,
                      ]}
                      stroke={color}
                      strokeWidth={2}
                    />
                  </>
                ) : (
                  <>
                    <Line
                      points={[
                        px - halfW * (dx / len) + nx * 3,
                        py - halfW * (dy / len) + ny * 3,
                        px + halfW * (dx / len) + nx * 3,
                        py + halfW * (dy / len) + ny * 3,
                      ]}
                      stroke={color}
                      strokeWidth={2}
                    />
                    <Line
                      points={[
                        px - halfW * (dx / len) + nx * 3,
                        py - halfW * (dy / len) + ny * 3,
                        px - halfW * (dx / len) + nx * 8,
                        py - halfW * (dy / len) + ny * 8,
                      ]}
                      stroke={color}
                      strokeWidth={1}
                    />
                    <Line
                      points={[
                        px + halfW * (dx / len) + nx * 3,
                        py + halfW * (dy / len) + ny * 3,
                        px + halfW * (dx / len) + nx * 8,
                        py + halfW * (dy / len) + ny * 8,
                      ]}
                      stroke={color}
                      strokeWidth={1}
                    />
                  </>
                )}
              </Group>
            );
          })}
        </Layer>

        <Layer>
          {furniture.map((item) => {
            const isSelected = item.id === selectedFurnitureId;
            const hw = (item.width * GRID_SIZE) / 2;
            const hh = (item.height * GRID_SIZE) / 2;
            return (
              <Group key={item.id} x={item.x} y={item.y} rotation={item.rotation}>
                <Rect
                  x={-hw}
                  y={-hh}
                  width={item.width * GRID_SIZE}
                  height={item.height * GRID_SIZE}
                  fill={isSelected ? "#4a7cff" : "#3a3a5e"}
                  stroke={isSelected ? "#4a7cff" : "#6b7280"}
                  strokeWidth={1}
                  cornerRadius={3}
                />
                <Text
                  x={-hw + 4}
                  y={-hh + 2}
                  text={item.name}
                  fontSize={8}
                  fill="#9ca3af"
                  fontFamily="monospace"
                  width={item.width * GRID_SIZE - 8}
                  height={item.height * GRID_SIZE - 4}
                />
              </Group>
            );
          })}
        </Layer>

        <Layer>
          {(activeTool === "wall" || activeTool === "room") &&
            drawingStart &&
            drawingEnd && (
              <>
                <Line
                  points={[
                    drawingStart.x,
                    drawingStart.y,
                    drawingEnd.x,
                    drawingEnd.y,
                  ]}
                  stroke="#4a7cff"
                  strokeWidth={WALL_WIDTH}
                  dash={[5, 5]}
                  lineCap="round"
                />
                {activeTool === "room" && drawingStart && drawingEnd && (
                  <Line
                    points={[
                      drawingStart.x, drawingStart.y,
                      drawingEnd.x, drawingStart.y,
                      drawingEnd.x, drawingEnd.y,
                      drawingStart.x, drawingEnd.y,
                      drawingStart.x, drawingStart.y,
                    ]}
                    stroke="#4a7cff"
                    strokeWidth={1}
                    dash={[4, 4]}
                  />
                )}
                <Text
                  x={(drawingStart.x + drawingEnd.x) / 2 - 20}
                  y={(drawingStart.y + drawingEnd.y) / 2 - 12}
                  text={`${(
                    distance(drawingStart, drawingEnd) / GRID_SIZE
                  ).toFixed(2)} m`}
                  fontSize={10}
                  fill="#4a7cff"
                  fontFamily="monospace"
                />
              </>
            )}
        </Layer>

        <Layer>
          {activeTool === "measure" && measurePoints.length > 0 && (
            <>
              <Circle
                x={measurePoints[0].x}
                y={measurePoints[0].y}
                radius={4}
                fill="#f0c040"
              />
              {measurePoints.length === 2 && (
                <>
                  <Line
                    points={[
                      measurePoints[0].x,
                      measurePoints[0].y,
                      measurePoints[1].x,
                      measurePoints[1].y,
                    ]}
                    stroke="#f0c040"
                    strokeWidth={1}
                    dash={[4, 4]}
                  />
                  <Text
                    x={
                      (measurePoints[0].x + measurePoints[1].x) / 2 - 20
                    }
                    y={
                      (measurePoints[0].y + measurePoints[1].y) / 2 - 12
                    }
                    text={`${(
                      distance(measurePoints[0], measurePoints[1]) /
                      GRID_SIZE
                    ).toFixed(2)} m`}
                    fontSize={11}
                    fill="#f0c040"
                    fontFamily="monospace"
                  />
                  <Circle
                    x={measurePoints[1].x}
                    y={measurePoints[1].y}
                    radius={4}
                    fill="#f0c040"
                  />
                </>
              )}
            </>
          )}
        </Layer>

        <Layer>
          {activeFurnitureTemplate && drawingStart && drawingEnd && (
            <Rect
              x={drawingEnd.x - (activeFurnitureTemplate.width * GRID_SIZE) / 2}
              y={drawingEnd.y - (activeFurnitureTemplate.height * GRID_SIZE) / 2}
              width={activeFurnitureTemplate.width * GRID_SIZE}
              height={activeFurnitureTemplate.height * GRID_SIZE}
              fill="#4a7cff40"
              stroke="#4a7cff"
              strokeWidth={1}
              dash={[4, 4]}
              cornerRadius={3}
            />
          )}
        </Layer>
      </Stage>

      {walls.length === 0 && !drawingStart && (
        <div className="absolute inset-4 border border-dashed border-border rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-muted text-sm">2D Floor Plan Canvas</p>
            <p className="text-muted/50 text-xs mt-1">
              {activeTool === "wall" || activeTool === "room"
                ? "Click and drag on the canvas"
                : activeTool === "measure"
                ? "Click two points to measure distance"
                : "Select a tool to start"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
