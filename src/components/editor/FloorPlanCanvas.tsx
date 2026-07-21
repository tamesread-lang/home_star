"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Stage, Layer, Line, Circle, Text, Group, Rect } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEditorStore } from "@/store/editor-store";
import type { Point, Wall, Opening, FurnitureItem, Column, FloorLabel, FloorFill } from "@/types/editor";
import {
  openingPositionOnWall,
  getDefaultThickness,
  distance,
  computeCleanEndpoints,
  wallOffsetPoints,
  projectPointOnSegment,
} from "@/types/editor";
import type { CleanWallEndpoints } from "@/types/editor";

const GRID_SIZE = 50;
const SNAP_DISTANCE = 10;
const WALL_WIDTH = 8;

function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
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

function segmentIntersection(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
  const dax = a2.x - a1.x;
  const day = a2.y - a1.y;
  const dbx = b2.x - b1.x;
  const dby = b2.y - b1.y;
  const denom = dax * dby - day * dbx;
  if (Math.abs(denom) < 0.001) return null;
  const t = ((b1.x - a1.x) * dby - (b1.y - a1.y) * dbx) / denom;
  const u = ((b1.x - a1.x) * day - (b1.y - a1.y) * dax) / denom;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: a1.x + t * dax, y: a1.y + t * day };
  }
  return null;
}

function findNearestWallIntersection(wall: Wall, walls: Wall[]): { wall: Wall; point: Point } | null {
  const a1: Point = { x: wall.x1, y: wall.y1 };
  const a2: Point = { x: wall.x2, y: wall.y2 };
  let best: { wall: Wall; point: Point; dist: number } | null = null;
  for (const other of walls) {
    if (other.id === wall.id) continue;
    const b1: Point = { x: other.x1, y: other.y1 };
    const b2: Point = { x: other.x2, y: other.y2 };
    const pt = segmentIntersection(a1, a2, b1, b2);
    if (pt) {
      const d1 = distance(a1, pt);
      const d2 = distance(a2, pt);
      const d = Math.min(d1, d2);
      if (!best || d < best.dist) {
        best = { wall: other, point: pt, dist: d };
      }
    }
  }
  return best ? { wall: best.wall, point: best.point } : null;
}

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Date.now()}`;
}

const FILL_COLORS: Record<string, string> = {
  tile: "#4a7cff30",
  parquet: "#c8a05030",
  concrete: "#88888830",
};

const FILL_BORDER: Record<string, string> = {
  tile: "#4a7cff60",
  parquet: "#c8a05060",
  concrete: "#88888860",
};

export default function FloorPlanCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [drawingStart, setDrawingStart] = useState<Point | null>(null);
  const [drawingEnd, setDrawingEnd] = useState<Point | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [measureStart, setMeasureStart] = useState<Point | null>(null);
  const isDrawingRef = useRef(false);

  const walls = useEditorStore((s) => s.walls);
  const openings = useEditorStore((s) => s.openings);
  const columns = useEditorStore((s) => s.columns);
  const labels = useEditorStore((s) => s.labels);
  const measureLines = useEditorStore((s) => s.measureLines);
  const floorFills = useEditorStore((s) => s.floorFills);
  const furniture = useEditorStore((s) => s.furniture);
  const activeTool = useEditorStore((s) => s.activeTool);
  const gridVisible = useEditorStore((s) => s.gridVisible);
  const snapSize = useEditorStore((s) => s.snapSize);
  const wallAlignment = useEditorStore((s) => s.wallAlignment);
  const columnAlignMode = useEditorStore((s) => s.columnAlignMode);
  const offsetDistance = useEditorStore((s) => s.offsetDistance);
  const selectedWallId = useEditorStore((s) => s.selectedWallId);
  const selectedOpeningId = useEditorStore((s) => s.selectedOpeningId);
  const selectedColumnId = useEditorStore((s) => s.selectedColumnId);
  const selectedLabelId = useEditorStore((s) => s.selectedLabelId);
  const selectedFurnitureId = useEditorStore((s) => s.selectedFurnitureId);
  const landWidth = useEditorStore((s) => s.landWidth);
  const landLength = useEditorStore((s) => s.landLength);
  const wallHeight = useEditorStore((s) => s.wallHeight);
  const wallType = useEditorStore((s) => s.wallType);
  const activeFurnitureTemplate = useEditorStore((s) => s.activeFurnitureTemplate);

  const addWall = useEditorStore((s) => s.addWall);
  const addWalls = useEditorStore((s) => s.addWalls);
  const deleteWall = useEditorStore((s) => s.deleteWall);
  const selectWall = useEditorStore((s) => s.selectWall);
  const selectOpening = useEditorStore((s) => s.selectOpening);
  const selectColumn = useEditorStore((s) => s.selectColumn);
  const selectLabel = useEditorStore((s) => s.selectLabel);
  const selectFurniture = useEditorStore((s) => s.selectFurniture);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const addOpening = useEditorStore((s) => s.addOpening);
  const addFurniture = useEditorStore((s) => s.addFurniture);
  const deleteFurniture = useEditorStore((s) => s.deleteFurniture);
  const addColumn = useEditorStore((s) => s.addColumn);
  const addLabel = useEditorStore((s) => s.addLabel);
  const deleteColumn = useEditorStore((s) => s.deleteColumn);
  const deleteLabel = useEditorStore((s) => s.deleteLabel);
  const addMeasureLine = useEditorStore((s) => s.addMeasureLine);
  const addFloorFill = useEditorStore((s) => s.addFloorFill);
  const updateWall = useEditorStore((s) => s.updateWall);
  const updateFurniture = useEditorStore((s) => s.updateFurniture);
  const setActiveFurnitureTemplate = useEditorStore((s) => s.setActiveFurnitureTemplate);

  // Clean wall endpoints for rendering clean joints
  const cleanEndpoints = useMemo(() => computeCleanEndpoints(walls), [walls]);

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
        if (pointToSegmentDistance(pos, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }) < threshold) return w;
      }
      return null;
    },
    [walls]
  );

  const getColumnAtPoint = useCallback(
    (pos: Point): Column | null => {
      for (let i = columns.length - 1; i >= 0; i--) {
        const c = columns[i];
        const hw = (c.width * GRID_SIZE) / 2;
        const hd = (c.depth * GRID_SIZE) / 2;
        if (pos.x >= c.x - hw && pos.x <= c.x + hw && pos.y >= c.y - hd && pos.y <= c.y + hd) return c;
      }
      return null;
    },
    [columns]
  );

  const getLabelAtPoint = useCallback(
    (pos: Point): FloorLabel | null => {
      for (let i = labels.length - 1; i >= 0; i--) {
        if (distance(pos, { x: labels[i].x, y: labels[i].y }) < 15) return labels[i];
      }
      return null;
    },
    [labels]
  );

  const getFurnitureAtPoint = useCallback(
    (pos: Point): FurnitureItem | null => {
      for (let i = furniture.length - 1; i >= 0; i--) {
        const f = furniture[i];
        const hw = (f.width * GRID_SIZE) / 2;
        const hh = (f.height * GRID_SIZE) / 2;
        if (pos.x >= f.x - hw && pos.x <= f.x + hw && pos.y >= f.y - hh && pos.y <= f.y + hh) return f;
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

  const getWallAlignedCoords = useCallback(
    (x1: number, y1: number, x2: number, y2: number, thickness: number) => {
      if (wallAlignment === "center") return { x1, y1, x2, y2 };
      const offsetPx = ((thickness / 2) * GRID_SIZE) * (wallAlignment === "outer" ? 1 : -1);
      const { nx, ny } = wallOffsetPoints(x1, y1, x2, y2, offsetPx);
      return { x1: x1 + nx, y1: y1 + ny, x2: x2 + nx, y2: y2 + ny };
    },
    [wallAlignment]
  );

  const getColumnSnapPosition = useCallback(
    (pos: Point): Point => {
      if (columnAlignMode === "none" || walls.length === 0) return pos;
      let best = { x: pos.x, y: pos.y, dist: Infinity };
      for (const w of walls) {
        const a: Point = { x: w.x1, y: w.y1 };
        const b: Point = { x: w.x2, y: w.y2 };
        const d = pointToSegmentDistance(pos, a, b);
        if (d > GRID_SIZE) continue;
        if (columnAlignMode === "center") {
          const proj = projectPointOnSegment(pos, a, b);
          if (distance(pos, proj) < best.dist) { best = { ...proj, dist: distance(pos, proj) }; }
        } else if (columnAlignMode === "outer_edge") {
          const proj = projectPointOnSegment(pos, a, b);
          const { nx, ny } = wallOffsetPoints(w.x1, w.y1, w.x2, w.y2, (w.thickness / 2) * GRID_SIZE);
          const edge = { x: proj.x + nx, y: proj.y + ny };
          if (distance(pos, edge) < best.dist) { best = { ...edge, dist: distance(pos, edge) }; }
        } else if (columnAlignMode === "corner") {
          for (const pt of [a, b]) {
            const d = distance(pos, pt);
            if (d < best.dist) { best = { ...pt, dist: d }; }
          }
        }
      }
      return best.dist < Infinity ? { x: snapToGrid(best.x, snapSize), y: snapToGrid(best.y, snapSize) } : pos;
    },
    [walls, columnAlignMode, snapSize]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (activeTool !== "select" && activeTool !== "eraser") return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const state = useEditorStore.getState();
        if (state.selectedWallId) { state.deleteWall(state.selectedWallId); state.clearSelection(); }
        else if (state.selectedFurnitureId) { state.deleteFurniture(state.selectedFurnitureId); state.clearSelection(); }
        else if (state.selectedColumnId) { state.deleteColumn(state.selectedColumnId); state.clearSelection(); }
        else if (state.selectedLabelId) { state.deleteLabel(state.selectedLabelId); state.clearSelection(); }
        else if (state.selectedOpeningId) { state.deleteOpening(state.selectedOpeningId); state.clearSelection(); }
      }
    },
    [activeTool]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const pos = getStagePos(e);

      if (activeFurnitureTemplate) {
        addFurniture({
          id: genId("furn"), name: activeFurnitureTemplate.name, category: "",
          x: pos.x, y: pos.y, width: activeFurnitureTemplate.width, height: activeFurnitureTemplate.height,
          rotation: 0, elevation: 0,
        });
        setActiveFurnitureTemplate(null);
        return;
      }

      if (activeTool === "column") {
        const snapped = getColumnSnapPosition({
          x: snapSize > 0 ? snapToGrid(pos.x, snapSize) : pos.x,
          y: snapSize > 0 ? snapToGrid(pos.y, snapSize) : pos.y,
        });
        addColumn({ id: genId("col"), x: snapped.x, y: snapped.y, width: 0.3, depth: 0.3, height: wallHeight });
        return;
      }

      if (activeTool === "label") {
        const text = window.prompt("Room/Label name:", "Room") || "Room";
        addLabel({ id: genId("lbl"), x: pos.x, y: pos.y, text, rotation: 0 });
        return;
      }

      if (activeTool === "measure") {
        const snapped = {
          x: snapSize > 0 ? snapToGrid(pos.x, snapSize) : pos.x,
          y: snapSize > 0 ? snapToGrid(pos.y, snapSize) : pos.y,
        };
        if (!measureStart) {
          setMeasureStart(snapped);
        } else {
          if (distance(measureStart, snapped) > 3) {
            addMeasureLine({ id: genId("meas"), x1: measureStart.x, y1: measureStart.y, x2: snapped.x, y2: snapped.y });
          }
          setMeasureStart(null);
        }
        return;
      }

      if (activeTool === "rotate") {
        const clickedFurniture = getFurnitureAtPoint(pos);
        if (clickedFurniture) {
          updateFurniture(clickedFurniture.id, { rotation: (clickedFurniture.rotation + 45) % 360 });
        }
        return;
      }

      if (activeTool === "mirror") {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          const mx = (clickedWall.x1 + clickedWall.x2) / 2;
          const newX1 = mx + (mx - clickedWall.x1);
          const newX2 = mx + (mx - clickedWall.x2);
          updateWall(clickedWall.id, { x1: newX1, x2: newX2 });
        }
        return;
      }

      if (activeTool === "trim") {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          const intersection = findNearestWallIntersection(clickedWall, walls);
          if (intersection) {
            const d1 = distance({ x: clickedWall.x1, y: clickedWall.y1 }, intersection.point);
            const d2 = distance({ x: clickedWall.x2, y: clickedWall.y2 }, intersection.point);
            if (d1 < d2) {
              updateWall(clickedWall.id, { x1: intersection.point.x, y1: intersection.point.y });
            } else {
              updateWall(clickedWall.id, { x2: intersection.point.x, y2: intersection.point.y });
            }
          }
        }
        return;
      }

      if (activeTool === "offset") {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          const offsetPx = offsetDistance * GRID_SIZE;
          const { nx, ny } = wallOffsetPoints(clickedWall.x1, clickedWall.y1, clickedWall.x2, clickedWall.y2, offsetPx);
          addWall({
            id: genId("wall"), x1: clickedWall.x1 + nx, y1: clickedWall.y1 + ny,
            x2: clickedWall.x2 + nx, y2: clickedWall.y2 + ny,
            thickness: getDefaultThickness(wallType), height: wallHeight, wallType,
          });
        }
        return;
      }

      if (activeTool === "fill") {
        const fillSize = 30;
        addFloorFill({
          id: genId("fill"),
          points: [
            { x: pos.x - fillSize, y: pos.y - fillSize },
            { x: pos.x + fillSize, y: pos.y - fillSize },
            { x: pos.x + fillSize, y: pos.y + fillSize },
            { x: pos.x - fillSize, y: pos.y + fillSize },
          ],
          fillType: "tile",
        });
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
            const thickness = getDefaultThickness(wallType);
            const aligned = getWallAlignedCoords(drawingStart.x, drawingStart.y, snapped.x, snapped.y, thickness);
            addWall({
              id: genId("wall"), x1: aligned.x1, y1: aligned.y1, x2: aligned.x2, y2: aligned.y2,
              thickness, height: wallHeight, wallType,
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
        setDrawingStart(snapped);
        setDrawingEnd(snapped);
        isDrawingRef.current = true;
        return;
      }

      if (activeTool === "select") {
        const clickedFurniture = getFurnitureAtPoint(pos);
        if (clickedFurniture) { selectFurniture(clickedFurniture.id); return; }
        const clickedLabel = getLabelAtPoint(pos);
        if (clickedLabel) { selectLabel(clickedLabel.id); return; }
        const clickedColumn = getColumnAtPoint(pos);
        if (clickedColumn) { selectColumn(clickedColumn.id); return; }
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) { selectWall(clickedWall.id); }
        else { clearSelection(); }
        return;
      }

      if (activeTool === "door" || activeTool === "sliding_door" || activeTool === "window") {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          const t = openingPositionOnWall(clickedWall, pos.x, pos.y);
          const isDoor = activeTool === "door";
          const isSliding = activeTool === "sliding_door";
          const isWindow = activeTool === "window";
          let width = 0.9, sillHeight = 0;
          if (isWindow) { width = 1.2; sillHeight = 0.9; }
          if (isSliding) { width = 1.8; }
          addOpening({
            id: genId("open"), wallId: clickedWall.id,
            type: isDoor ? "door" : isSliding ? "sliding_door" : "window",
            position: t, width, height: isWindow ? 1.2 : 2.1, sillHeight,
          });
        }
        return;
      }

      if (activeTool === "eraser") {
        const fi = getFurnitureAtPoint(pos);
        if (fi) { deleteFurniture(fi.id); return; }
        const lb = getLabelAtPoint(pos);
        if (lb) { deleteLabel(lb.id); return; }
        const cl = getColumnAtPoint(pos);
        if (cl) { deleteColumn(cl.id); return; }
        const wl = getWallAtPoint(pos);
        if (wl) { deleteWall(wl.id); return; }
        const op = (() => {
          for (let i = openings.length - 1; i >= 0; i--) {
            const o = openings[i];
            const pw = walls.find((w) => w.id === o.wallId);
            if (!pw) continue;
            if (distance(pos, { x: pw.x1 + o.position * (pw.x2 - pw.x1), y: pw.y1 + o.position * (pw.y2 - pw.y1) }) < 10) return o;
          }
          return null;
        })();
        if (op) { useEditorStore.getState().deleteOpening(op.id); }
        return;
      }
    },
    [
      activeTool, drawingStart, getStagePos, snapPoint, getWallAlignedCoords, getColumnSnapPosition,
      addWall, selectWall, selectColumn, selectLabel, selectFurniture, clearSelection,
      deleteWall, deleteColumn, deleteLabel, deleteFurniture,
      getWallAtPoint, getColumnAtPoint, getLabelAtPoint, getFurnitureAtPoint,
      addOpening, addFurniture, addColumn, addLabel, addMeasureLine, addFloorFill,
      updateWall, updateFurniture, wallHeight, wallType, measureStart, snapSize,
      offsetDistance, wallAlignment, columnAlignMode,
      activeFurnitureTemplate, setActiveFurnitureTemplate, walls, openings, columns, labels, furniture,
    ]
  );

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const pos = getStagePos(e);
      setMousePos(pos);
      if (isDrawingRef.current && (activeTool === "wall" || activeTool === "room")) {
        setDrawingEnd(snapPoint(pos, true));
      }
    },
    [activeTool, getStagePos, snapPoint]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawingRef.current || !drawingStart) {
      isDrawingRef.current = false;
      return;
    }

    if (activeTool === "room") {
      const snapped = drawingEnd || drawingStart;
      if (distance(drawingStart, snapped) > 10) {
        const { x: x1, y: y1 } = drawingStart;
        const { x: x2, y: y2 } = snapped;
        const t = getDefaultThickness(wallType);
        const align = (xx1: number, yy1: number, xx2: number, yy2: number) =>
          getWallAlignedCoords(xx1, yy1, xx2, yy2, t);
        const a1 = align(x1, y1, x2, y1);
        const a2 = align(x2, y1, x2, y2);
        const a3 = align(x2, y2, x1, y2);
        const a4 = align(x1, y2, x1, y1);
        addWall({ id: genId("wall"), x1: a1.x1, y1: a1.y1, x2: a1.x2, y2: a1.y2, thickness: t, height: wallHeight, wallType });
        addWall({ id: genId("wall"), x1: a2.x1, y1: a2.y1, x2: a2.x2, y2: a2.y2, thickness: t, height: wallHeight, wallType });
        addWall({ id: genId("wall"), x1: a3.x1, y1: a3.y1, x2: a3.x2, y2: a3.y2, thickness: t, height: wallHeight, wallType });
        addWall({ id: genId("wall"), x1: a4.x1, y1: a4.y1, x2: a4.x2, y2: a4.y2, thickness: t, height: wallHeight, wallType });
      }
    } else if (activeTool === "wall") {
      const snapped = drawingEnd || drawingStart;
      if (distance(drawingStart, snapped) > 5) {
        const thickness = getDefaultThickness(wallType);
        const aligned = getWallAlignedCoords(drawingStart.x, drawingStart.y, snapped.x, snapped.y, thickness);
        addWall({
          id: genId("wall"), x1: aligned.x1, y1: aligned.y1, x2: aligned.x2, y2: aligned.y2,
          thickness, height: wallHeight, wallType,
        });
      }
    }

    setDrawingStart(null);
    setDrawingEnd(null);
    isDrawingRef.current = false;
  }, [activeTool, drawingStart, drawingEnd, addWall, wallHeight, wallType, getWallAlignedCoords]);

  const landBoundX = GRID_SIZE;
  const landBoundY = GRID_SIZE;
  const landBoundW = landWidth * GRID_SIZE;
  const landBoundH = landLength * GRID_SIZE;

  const gridStep = snapSize > 0 ? snapSize : GRID_SIZE;
  const minorGridLines: { x: number; y: number; w: number; h: number }[] = [];
  const majorGridLines: { x: number; y: number; w: number; h: number }[] = [];
  if (gridVisible) {
    const step = Math.min(gridStep, 25);
    const mult = Math.round(25 / step);
    for (let x = 0; x < dimensions.width; x += step) {
      const arr = (x / step) % (mult * 5) === 0 ? majorGridLines : minorGridLines;
      arr.push({ x, y: 0, w: 1, h: dimensions.height });
    }
    for (let y = 0; y < dimensions.height; y += step) {
      const arr = (y / step) % (mult * 5) === 0 ? majorGridLines : minorGridLines;
      arr.push({ x: 0, y, w: dimensions.width, h: 1 });
    }
  }

  function renderGridLines(
    lines: { x: number; y: number; w: number; h: number }[],
    stroke: string, strokeWidth: number
  ) {
    if (lines.length > 500) {
      const factor = Math.ceil(lines.length / 500);
      lines = lines.filter((_, i) => i % factor === 0);
    }
    return lines.map((line, i) => (
      <Line key={`${stroke}-${i}`}
        points={line.w === 1 ? [line.x, line.y, line.x, line.y + line.h] : [line.x, line.y, line.x + line.w, line.y]}
        stroke={stroke} strokeWidth={strokeWidth} />
    ));
  }

  const furniturePreview = activeFurnitureTemplate && mousePos && (
    <Rect
      x={mousePos.x - (activeFurnitureTemplate.width * GRID_SIZE) / 2}
      y={mousePos.y - (activeFurnitureTemplate.height * GRID_SIZE) / 2}
      width={activeFurnitureTemplate.width * GRID_SIZE}
      height={activeFurnitureTemplate.height * GRID_SIZE}
      fill="#4a7cff30" stroke="#4a7cff" strokeWidth={1.5} dash={[4, 4]} cornerRadius={3} />
  );

  const measurePreview = activeTool === "measure" && measureStart && mousePos && (
    <Group>
      <Line points={[measureStart.x, measureStart.y, mousePos.x, mousePos.y]} stroke="#f59e0b" strokeWidth={2} dash={[6, 3]} />
      <Circle x={measureStart.x} y={measureStart.y} radius={4} fill="#f59e0b" />
      <Text x={(measureStart.x + mousePos.x) / 2 - 25} y={(measureStart.y + mousePos.y) / 2 - 14}
        text={`${(distance(measureStart, mousePos) / GRID_SIZE).toFixed(2)} m`} fontSize={11} fill="#f59e0b" fontFamily="monospace" />
    </Group>
  );

  return (
    <div ref={containerRef} className="relative flex-1 bg-[#0f0f23] overflow-hidden">
      <Stage
        width={dimensions.width} height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e: KonvaEventObject<PointerEvent>) => {
          e.evt.preventDefault();
          setDrawingStart(null); setDrawingEnd(null); setMeasureStart(null);
          isDrawingRef.current = false;
        }}
      >
        <Layer>
          {renderGridLines(minorGridLines, "#1a1a3e", 0.5)}
          {renderGridLines(majorGridLines, "#2a2a5e", 1)}
        </Layer>

        <Layer>
          <Line points={[landBoundX, landBoundY, landBoundX + landBoundW, landBoundY, landBoundX + landBoundW, landBoundY + landBoundH, landBoundX, landBoundY + landBoundH, landBoundX, landBoundY]}
            stroke="#4a7cff" strokeWidth={2} />
          <Text x={landBoundX + landBoundW / 2 - 30} y={landBoundY - 18} text={`${landWidth}m`} fontSize={10} fill="#4a7cff" fontFamily="monospace" />
          <Text x={landBoundX - 28} y={landBoundY + landBoundH / 2 - 6} text={`${landLength}m`} fontSize={10} fill="#4a7cff" fontFamily="monospace" />
        </Layer>

        <Layer>
          {floorFills.map((fill) => {
            const pts: number[] = [];
            fill.points.forEach((p) => { pts.push(p.x, p.y); });
            const color = FILL_COLORS[fill.fillType] || FILL_COLORS.tile;
            const border = FILL_BORDER[fill.fillType] || FILL_BORDER.tile;
            // Area label in m² (approximate from polygon bounding box)
            const xs = fill.points.map((p) => p.x);
            const ys = fill.points.map((p) => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const area = ((maxX - minX) / GRID_SIZE * (maxY - minY) / GRID_SIZE).toFixed(1);
            return (
              <Group key={fill.id}>
                <Line points={pts} closed fill={color} stroke={border} strokeWidth={1} />
                <Text x={(minX + maxX) / 2 - 15} y={(minY + maxY) / 2 - 5}
                  text={`${area} m²`} fontSize={9} fill="#ffffff80" fontFamily="monospace" />
              </Group>
            );
          })}
        </Layer>

        <Layer>
          {walls.map((wall) => {
            const ep = cleanEndpoints.get(wall.id);
            const cx1 = ep?.x1 ?? wall.x1, cy1 = ep?.y1 ?? wall.y1;
            const cx2 = ep?.x2 ?? wall.x2, cy2 = ep?.y2 ?? wall.y2;
            const isSelected = wall.id === selectedWallId;
            const midX = (cx1 + cx2) / 2, midY = (cy1 + cy2) / 2;
            const dx = wall.x2 - wall.x1, dy = wall.y2 - wall.y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const meters = (len / GRID_SIZE).toFixed(2);
            const isExterior = wall.wallType === "exterior";
            const sw = isSelected ? WALL_WIDTH + 4 : isExterior ? WALL_WIDTH + 3 : WALL_WIDTH;
            return (
              <Group key={wall.id}>
                <Line points={[cx1, cy1, cx2, cy2]}
                  stroke={isSelected ? "#4a7cff" : isExterior ? "#8899bb" : "#6b7280"}
                  strokeWidth={sw} lineCap="butt" lineJoin="miter" />
                <Text x={midX - 18} y={midY - 10} text={`${meters} m`} fontSize={10}
                  fill={isSelected ? "#4a7cff" : "#9ca3af"} fontFamily="monospace" />
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
            const pw = walls.find((w) => w.id === opening.wallId);
            if (!pw) return null;
            const px = pw.x1 + opening.position * (pw.x2 - pw.x1);
            const py = pw.y1 + opening.position * (pw.y2 - pw.y1);
            const dx = pw.x2 - pw.x1, dy = pw.y2 - pw.y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 1) return null;
            const nx = -dy / len, ny = dx / len;
            const halfW = (opening.width * GRID_SIZE) / 2;
            const perpLen = opening.type === "door" ? 15 : opening.type === "sliding_door" ? 12 : 10;
            const isSelected = opening.id === selectedOpeningId;
            const color = isSelected ? "#4a7cff" : opening.type === "door" ? "#e8a87c" : "#7cc8e8";

            if (opening.type === "sliding_door") {
              return (
                <Group key={opening.id}>
                  <Line points={[px - halfW * (dx / len) - nx * 4, py - halfW * (dy / len) - ny * 4, px + halfW * (dx / len) - nx * 4, py + halfW * (dy / len) - ny * 4]} stroke={color} strokeWidth={2} />
                  <Line points={[px - halfW * (dx / len) + nx * 4, py - halfW * (dy / len) + ny * 4, px + halfW * (dx / len) + nx * 4, py + halfW * (dy / len) + ny * 4]} stroke={color} strokeWidth={2} />
                  <Line points={[px - halfW * (dx / len), py - halfW * (dy / len), px + halfW * (dx / len), py + halfW * (dy / len)]} stroke={color} strokeWidth={1} dash={[2, 2]} />
                </Group>
              );
            }

            if (opening.type === "door") {
              return (
                <Group key={opening.id}>
                  <Line points={[px - halfW * (dx / len), py - halfW * (dy / len), px + halfW * (dx / len), py + halfW * (dy / len)]} stroke={color} strokeWidth={2} />
                  <Line points={[px + halfW * (dx / len), py + halfW * (dy / len), px + halfW * (dx / len) + nx * perpLen, py + halfW * (dy / len) + ny * perpLen]} stroke={color} strokeWidth={2} />
                </Group>
              );
            }

            return (
              <Group key={opening.id}>
                <Line points={[px - halfW * (dx / len) + nx * 3, py - halfW * (dy / len) + ny * 3, px + halfW * (dx / len) + nx * 3, py + halfW * (dy / len) + ny * 3]} stroke={color} strokeWidth={2} />
                <Line points={[px - halfW * (dx / len) + nx * 3, py - halfW * (dy / len) + ny * 3, px - halfW * (dx / len) + nx * 8, py - halfW * (dy / len) + ny * 8]} stroke={color} strokeWidth={1} />
                <Line points={[px + halfW * (dx / len) + nx * 3, py + halfW * (dy / len) + ny * 3, px + halfW * (dx / len) + nx * 8, py + halfW * (dy / len) + ny * 8]} stroke={color} strokeWidth={1} />
              </Group>
            );
          })}
        </Layer>

        <Layer>
          {columns.map((col) => {
            const isSelected = col.id === selectedColumnId;
            const hw = (col.width * GRID_SIZE) / 2;
            const hd = (col.depth * GRID_SIZE) / 2;
            return (
              <Group key={col.id}>
                <Rect x={col.x - hw} y={col.y - hd} width={col.width * GRID_SIZE} height={col.depth * GRID_SIZE}
                  fill={isSelected ? "#4a7cff" : "#6b7280"} stroke={isSelected ? "#4a7cff" : "#4b5563"} strokeWidth={1.5} />
                <Rect x={col.x - hw + 3} y={col.y - hd + 3} width={col.width * GRID_SIZE - 6} height={col.depth * GRID_SIZE - 6}
                  fill="none" stroke={isSelected ? "#4a7cff" : "#9ca3af"} strokeWidth={0.5} />
              </Group>
            );
          })}
        </Layer>

        <Layer>
          {labels.map((lbl) => {
            const isSelected = lbl.id === selectedLabelId;
            return (
              <Group key={lbl.id} x={lbl.x} y={lbl.y} rotation={lbl.rotation}>
                <Rect x={-lbl.text.length * 4 - 6} y={-9} width={lbl.text.length * 8 + 12} height={18}
                  fill={isSelected ? "#4a7cff20" : "#00000030"} stroke={isSelected ? "#4a7cff" : "transparent"} strokeWidth={1} cornerRadius={3} />
                <Text text={lbl.text} fontSize={13} fill={isSelected ? "#4a7cff" : "#e0e0e0"} fontFamily="monospace" fontStyle="bold" />
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
                <Rect x={-hw} y={-hh} width={item.width * GRID_SIZE} height={item.height * GRID_SIZE}
                  fill={isSelected ? "#4a7cff" : "#3a3a5e"}
                  stroke={isSelected ? "#4a7cff" : "#6b7280"} strokeWidth={1} cornerRadius={3} />
                <Text x={-hw + 4} y={-hh + 2} text={item.name} fontSize={8} fill="#9ca3af" fontFamily="monospace" width={item.width * GRID_SIZE - 8} />
              </Group>
            );
          })}
        </Layer>

        <Layer>
          {measureLines.map((line) => (
            <Group key={line.id}>
              <Line points={[line.x1, line.y1, line.x2, line.y2]} stroke="#f59e0b" strokeWidth={1.5} />
              <Circle x={line.x1} y={line.y1} radius={3} fill="#f59e0b" />
              <Circle x={line.x2} y={line.y2} radius={3} fill="#f59e0b" />
              <Text x={(line.x1 + line.x2) / 2 - 25} y={(line.y1 + line.y2) / 2 - 12}
                text={`${(distance({ x: line.x1, y: line.y1 }, { x: line.x2, y: line.y2 }) / GRID_SIZE).toFixed(2)} m`}
                fontSize={10} fill="#f59e0b" fontFamily="monospace" />
            </Group>
          ))}
        </Layer>

        <Layer>
          {(activeTool === "wall" || activeTool === "room") && drawingStart && drawingEnd && (
            <>
              {activeTool === "room" ? (
                <Line points={[drawingStart.x, drawingStart.y, drawingEnd.x, drawingStart.y, drawingEnd.x, drawingEnd.y, drawingStart.x, drawingEnd.y, drawingStart.x, drawingStart.y]}
                  stroke="#4a7cff" strokeWidth={1} dash={[4, 4]} />
              ) : (
                <Line points={[drawingStart.x, drawingStart.y, drawingEnd.x, drawingEnd.y]}
                  stroke="#4a7cff" strokeWidth={WALL_WIDTH} dash={[5, 5]} lineCap="round" />
              )}
              <Text x={(drawingStart.x + drawingEnd.x) / 2 - 20} y={(drawingStart.y + drawingEnd.y) / 2 - 12}
                text={`${(distance(drawingStart, drawingEnd) / GRID_SIZE).toFixed(2)} m`}
                fontSize={10} fill="#4a7cff" fontFamily="monospace" />
            </>
          )}
        </Layer>

        <Layer>
          {furniturePreview}
          {measurePreview}
        </Layer>
      </Stage>

      {walls.length === 0 && !drawingStart && !activeFurnitureTemplate && !measureStart && (
        <div className="absolute inset-4 border border-dashed border-border rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-muted text-sm">2D Floor Plan Canvas</p>
            <p className="text-muted/50 text-xs mt-1">Select a tool to start</p>
          </div>
        </div>
      )}

      {activeFurnitureTemplate && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-4 py-2 text-xs text-muted shadow-lg z-10">
          Click anywhere on the canvas to place{" "}
          <span className="text-accent font-medium">{activeFurnitureTemplate.name}</span>
          {" "}({activeFurnitureTemplate.width.toFixed(1)}&times;{activeFurnitureTemplate.height.toFixed(1)}m)
        </div>
      )}

      {activeTool === "measure" && measureStart && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-4 py-2 text-xs text-muted shadow-lg z-10">
          Click the second point to finish measurement
        </div>
      )}
    </div>
  );
}
