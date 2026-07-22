"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Stage, Layer, Line, Circle, Text, Group, Rect, Arc } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEditorStore } from "@/store/editor-store";
import type {
  Point, Wall, Opening, FurnitureItem, Column, FloorLabel, FloorFill,
  Tool, ArcWall, CurtainWall, Slab, SnapMode, SnapResult, CleanWallEndpoints,
} from "@/types/editor";
import {
  openingPositionOnWall, getDefaultThickness, distance, computeCleanEndpoints,
  wallOffsetPoints, projectPointOnSegment, segmentIntersection,
  getWallMidpoint, polygonArea, angleBetweenPoints,
} from "@/types/editor";

const GRID_SIZE = 50;
const SNAP_THRESHOLD = 12;

function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
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

function snapEndpoint(pos: Point, walls: Wall[], threshold: number): { point: Point; dist: number } | null {
  let best: { point: Point; dist: number } | null = null;
  for (const w of walls) {
    for (const p of [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }]) {
      const d = distance(pos, p);
      if (d < threshold && (!best || d < best.dist)) {
        best = { point: p, dist: d };
      }
    }
  }
  return best;
}

function snapMidpoint(pos: Point, walls: Wall[], threshold: number): { point: Point; dist: number } | null {
  let best: { point: Point; dist: number } | null = null;
  for (const w of walls) {
    const mp = getWallMidpoint(w);
    const d = distance(pos, mp);
    if (d < threshold && (!best || d < best.dist)) {
      best = { point: mp, dist: d };
    }
  }
  return best;
}

function snapIntersection(pos: Point, walls: Wall[], threshold: number): { point: Point; dist: number } | null {
  let best: { point: Point; dist: number } | null = null;
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const a1: Point = { x: walls[i].x1, y: walls[i].y1 };
      const a2: Point = { x: walls[i].x2, y: walls[i].y2 };
      const b1: Point = { x: walls[j].x1, y: walls[j].y1 };
      const b2: Point = { x: walls[j].x2, y: walls[j].y2 };
      const pt = segmentIntersection(a1, a2, b1, b2);
      if (pt) {
        const d = distance(pos, pt);
        if (d < threshold && (!best || d < best.dist)) {
          best = { point: pt, dist: d };
        }
      }
    }
  }
  return best;
}

function runSnapEngine(pos: Point, walls: Wall[], snapModes: SnapMode[], gridSize: number): SnapResult {
  const gridPoint = { x: snapToGrid(pos.x, gridSize), y: snapToGrid(pos.y, gridSize) };
  const gridDist = distance(pos, gridPoint);
  let best: SnapResult = { point: { ...pos }, type: "none", distance: 0 };

  if (snapModes.includes("grid")) {
    best = { point: gridPoint, type: "grid", distance: gridDist };
  }

  if (snapModes.includes("endpoint")) {
    const ep = snapEndpoint(pos, walls, SNAP_THRESHOLD);
    if (ep && ep.dist < (best.type === "none" ? Infinity : best.distance)) {
      best = { point: ep.point, type: "endpoint", distance: ep.dist };
    }
  }

  if (snapModes.includes("midpoint")) {
    const mp = snapMidpoint(pos, walls, SNAP_THRESHOLD);
    if (mp && mp.dist < (best.type === "none" ? Infinity : best.distance)) {
      best = { point: mp.point, type: "midpoint", distance: mp.dist };
    }
  }

  if (snapModes.includes("intersection")) {
    const ip = snapIntersection(pos, walls, SNAP_THRESHOLD);
    if (ip && ip.dist < (best.type === "none" ? Infinity : best.distance)) {
      best = { point: ip.point, type: "intersection", distance: ip.dist };
    }
  }

  return best;
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
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<SnapResult | null>(null);
  const [moveOffset, setMoveOffset] = useState<Point | null>(null);
  const [extendPreview, setExtendPreview] = useState<Point | null>(null);
  const drawingStartRef = useRef<Point | null>(null);

  const walls = useEditorStore((s) => s.walls);
  const arcWalls = useEditorStore((s) => s.arcWalls);
  const curtainWalls = useEditorStore((s) => s.curtainWalls);
  const slabs = useEditorStore((s) => s.slabs);
  const openings = useEditorStore((s) => s.openings);
  const columns = useEditorStore((s) => s.columns);
  const labels = useEditorStore((s) => s.labels);
  const measureLines = useEditorStore((s) => s.measureLines);
  const angularDimensions = useEditorStore((s) => s.angularDimensions);
  const leaderArrows = useEditorStore((s) => s.leaderArrows);
  const areaPolygons = useEditorStore((s) => s.areaPolygons);
  const floorFills = useEditorStore((s) => s.floorFills);
  const furniture = useEditorStore((s) => s.furniture);
  const activeTool = useEditorStore((s) => s.activeTool);
  const gridVisible = useEditorStore((s) => s.gridVisible);
  const snapSize = useEditorStore((s) => s.snapSize);
  const snapModes = useEditorStore((s) => s.snapModes);
  const wallAlignment = useEditorStore((s) => s.wallAlignment);
  const columnAlignMode = useEditorStore((s) => s.columnAlignMode);
  const offsetDistance = useEditorStore((s) => s.offsetDistance);
  const wallThickness = useEditorStore((s) => s.wallThickness);
  const selectedWallId = useEditorStore((s) => s.selectedWallId);
  const selectedArcWallId = useEditorStore((s) => s.selectedArcWallId);
  const selectedCurtainWallId = useEditorStore((s) => s.selectedCurtainWallId);
  const selectedSlabId = useEditorStore((s) => s.selectedSlabId);
  const selectedOpeningId = useEditorStore((s) => s.selectedOpeningId);
  const selectedColumnId = useEditorStore((s) => s.selectedColumnId);
  const selectedLabelId = useEditorStore((s) => s.selectedLabelId);
  const selectedMeasureLineId = useEditorStore((s) => s.selectedMeasureLineId);
  const selectedFurnitureId = useEditorStore((s) => s.selectedFurnitureId);
  const selectedFillId = useEditorStore((s) => s.selectedFillId);
  const landWidth = useEditorStore((s) => s.landWidth);
  const landLength = useEditorStore((s) => s.landLength);
  const wallHeight = useEditorStore((s) => s.wallHeight);
  const wallType = useEditorStore((s) => s.wallType);
  const activeFurnitureTemplate = useEditorStore((s) => s.activeFurnitureTemplate);
  const tapeMeasurePoints = useEditorStore((s) => s.tapeMeasurePoints);
  const arcWallPoints = useEditorStore((s) => s.arcWallPoints);
  const polylinePoints = useEditorStore((s) => s.polylinePoints);
  const dimensionAngleCenter = useEditorStore((s) => s.dimensionAngleCenter);
  const dimensionAngleStart = useEditorStore((s) => s.dimensionAngleStart);
  const areaPolygonPoints = useEditorStore((s) => s.areaPolygonPoints);
  const leaderArrowStart = useEditorStore((s) => s.leaderArrowStart);
  const activeLayer = useEditorStore((s) => s.activeLayer);

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
  const setTapeMeasurePoints = useEditorStore((s) => s.setTapeMeasurePoints);
  const setArcWallPoints = useEditorStore((s) => s.setArcWallPoints);
  const setPolylinePoints = useEditorStore((s) => s.setPolylinePoints);
  const setIsDrawing = useEditorStore((s) => s.setIsDrawing);
  const setDimensionAngleCenter = useEditorStore((s) => s.setDimensionAngleCenter);
  const setDimensionAngleStart = useEditorStore((s) => s.setDimensionAngleStart);
  const setAreaPolygonPoints = useEditorStore((s) => s.setAreaPolygonPoints);
  const setLeaderArrowStart = useEditorStore((s) => s.setLeaderArrowStart);
  const resetDrawingState = useEditorStore((s) => s.resetDrawingState);
  const addArcWallAction = useEditorStore((s) => s.addArcWall);
  const addCurtainWall = useEditorStore((s) => s.addCurtainWall);
  const addSlab = useEditorStore((s) => s.addSlab);
  const addAngularDimension = useEditorStore((s) => s.addAngularDimension);
  const addLeaderArrowAction = useEditorStore((s) => s.addLeaderArrow);
  const addAreaPolygon = useEditorStore((s) => s.addAreaPolygon);
  const deleteAreaPolygon = useEditorStore((s) => s.deleteAreaPolygon);
  const selectArcWall = useEditorStore((s) => s.selectArcWall);
  const selectCurtainWall = useEditorStore((s) => s.selectCurtainWall);
  const selectSlab = useEditorStore((s) => s.selectSlab);
  const addTapeMeasureLine = useEditorStore((s) => s.addTapeMeasureLine);
  const tapeMeasureLines = useEditorStore((s) => s.tapeMeasureLines);
  const visibleLayers = useEditorStore((s) => s.visibleLayers);
  const addRoomPolygon = useEditorStore((s) => s.addRoomPolygon);
  const roomPolygons = useEditorStore((s) => s.roomPolygons);
  const toggleLayerVisibility = useEditorStore((s) => s.toggleLayerVisibility);

  const cleanEndpoints = useMemo(() => computeCleanEndpoints(walls), [walls]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => e.preventDefault();
    container.addEventListener("wheel", handleWheel, { passive: false });
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
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
    }), []
  );

  const getWallAtPoint = useCallback(
    (pos: Point): Wall | null => {
      const threshold = 8;
      for (let i = walls.length - 1; i >= 0; i--) {
        const w = walls[i];
        const dx = w.x2 - w.x1;
        const dy = w.y2 - w.y1;
        const len2 = dx * dx + dy * dy;
        if (len2 < 1) continue;
        const t = Math.max(0, Math.min(1, ((pos.x - w.x1) * dx + (pos.y - w.y1) * dy) / len2));
        const px = w.x1 + t * dx;
        const py = w.y1 + t * dy;
        if (distance(pos, { x: px, y: py }) < threshold) return w;
      }
      return null;
    }, [walls]
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
    }, [columns]
  );

  const getLabelAtPoint = useCallback(
    (pos: Point): FloorLabel | null => {
      for (let i = labels.length - 1; i >= 0; i--) {
        if (distance(pos, { x: labels[i].x, y: labels[i].y }) < 15) return labels[i];
      }
      return null;
    }, [labels]
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
    }, [furniture]
  );

  const getOpeningAtPoint = useCallback(
    (pos: Point): Opening | null => {
      for (let i = openings.length - 1; i >= 0; i--) {
        const o = openings[i];
        const pw = walls.find((w) => w.id === o.wallId);
        if (!pw) continue;
        const px = pw.x1 + o.position * (pw.x2 - pw.x1);
        const py = pw.y1 + o.position * (pw.y2 - pw.y1);
        if (distance(pos, { x: px, y: py }) < 12) return o;
      }
      return null;
    }, [openings, walls]
  );

  const getCurtainWallAtPoint = useCallback(
    (pos: Point): CurtainWall | null => {
      const threshold = 8;
      for (let i = curtainWalls.length - 1; i >= 0; i--) {
        const cw = curtainWalls[i];
        const dx = cw.x2 - cw.x1;
        const dy = cw.y2 - cw.y1;
        const len2 = dx * dx + dy * dy;
        if (len2 < 1) continue;
        const t = Math.max(0, Math.min(1, ((pos.x - cw.x1) * dx + (pos.y - cw.y1) * dy) / len2));
        const px = cw.x1 + t * dx;
        const py = cw.y1 + t * dy;
        if (distance(pos, { x: px, y: py }) < threshold) return cw;
      }
      return null;
    }, [curtainWalls]
  );

  const getSlabAtPoint = useCallback(
    (pos: Point): Slab | null => {
      for (let i = slabs.length - 1; i >= 0; i--) {
        const sl = slabs[i];
        for (const p of sl.points) {
          if (distance(pos, p) < 12) return sl;
        }
      }
      return null;
    }, [slabs]
  );

  const getArcWallAtPoint = useCallback(
    (pos: Point): ArcWall | null => {
      for (let i = arcWalls.length - 1; i >= 0; i--) {
        const aw = arcWalls[i];
        const d = distance(pos, { x: aw.cx, y: aw.cy });
        if (Math.abs(d - aw.radius * GRID_SIZE) < 8) return aw;
      }
      return null;
    }, [arcWalls]
  );

  const getWallAlignedCoords = useCallback(
    (x1: number, y1: number, x2: number, y2: number, thickness: number) => {
      if (wallAlignment === "center") return { x1, y1, x2, y2 };
      const offsetPx = ((thickness / 2) * GRID_SIZE) * (wallAlignment === "left" ? -1 : 1);
      const { nx, ny } = wallOffsetPoints(x1, y1, x2, y2, offsetPx);
      return { x1: x1 + nx, y1: y1 + ny, x2: x2 + nx, y2: y2 + ny };
    }, [wallAlignment]
  );

  const getColumnSnapPosition = useCallback(
    (pos: Point): Point => {
      if (columnAlignMode === "none" || walls.length === 0) return pos;
      let best = { x: pos.x, y: pos.y, dist: Infinity };
      for (const w of walls) {
        const a: Point = { x: w.x1, y: w.y1 };
        const b: Point = { x: w.x2, y: w.y2 };
        const d = distance(pos, projectPointOnSegment(pos, a, b));
        if (d > GRID_SIZE) continue;
        if (columnAlignMode === "center") {
          const proj = projectPointOnSegment(pos, a, b);
          if (d < best.dist) { best = { ...proj, dist: d }; }
        } else if (columnAlignMode === "outer_edge") {
          const proj = projectPointOnSegment(pos, a, b);
          const { nx, ny } = wallOffsetPoints(w.x1, w.y1, w.x2, w.y2, (w.thickness / 2) * GRID_SIZE);
          const edge = { x: proj.x + nx, y: proj.y + ny };
          const ed = distance(pos, edge);
          if (ed < best.dist) { best = { ...edge, dist: ed }; }
        } else if (columnAlignMode === "corner") {
          for (const pt of [a, b]) {
            const dd = distance(pos, pt);
            if (dd < best.dist) { best = { ...pt, dist: dd }; }
          }
        }
      }
      return best.dist < Infinity ? { x: snapToGrid(best.x, snapSize), y: snapToGrid(best.y, snapSize) } : pos;
    }, [walls, columnAlignMode, snapSize]
  );

  const snapPoint = useCallback(
    (pos: Point): SnapResult => {
      return runSnapEngine(pos, walls, snapModes, snapSize > 0 ? snapSize : GRID_SIZE);
    }, [walls, snapModes, snapSize]
  );

  const stackedDrawing = drawingStartRef.current;
  const drawingStart = stackedDrawing;

  // ─── Tool Handlers ───────────────────────────────────────
  const handlers: Record<Tool, {
    onMouseDown?: (pos: Point) => void;
    onMouseMove?: (pos: Point) => void;
    onMouseUp?: (pos: Point) => void;
    cursor?: string;
  }> = {
    // ── SELECT ──
    select: {
      cursor: "default",
      onMouseDown: (pos) => {
        const fi = getFurnitureAtPoint(pos);
        if (fi) { selectFurniture(fi.id); return; }
        const lb = getLabelAtPoint(pos);
        if (lb) { selectLabel(lb.id); return; }
        const cl = getColumnAtPoint(pos);
        if (cl) { selectColumn(cl.id); return; }
        const aw = getArcWallAtPoint(pos);
        if (aw) { selectArcWall(aw.id); return; }
        const cw = getCurtainWallAtPoint(pos);
        if (cw) { selectCurtainWall(cw.id); return; }
        const sl = getSlabAtPoint(pos);
        if (sl) { selectSlab(sl.id); return; }
        const op = getOpeningAtPoint(pos);
        if (op) { selectOpening(op.id); return; }
        const wl = getWallAtPoint(pos);
        if (wl) { selectWall(wl.id); return; }
        clearSelection();
      },
    },

    // ── MOVE_PAN ──
    move_pan: {
      cursor: "move",
      onMouseDown: (pos) => {
        const wall = getWallAtPoint(pos);
        if (wall && selectedWallId === wall.id) {
          setMoveOffset({ x: pos.x - wall.x1, y: pos.y - wall.y1 });
          return;
        }
        if (wall) { selectWall(wall.id); setMoveOffset({ x: pos.x - wall.x1, y: pos.y - wall.y1 }); }
        else clearSelection();
      },
      onMouseMove: (pos) => {
        if (!moveOffset || !selectedWallId) return;
        const wall = walls.find((w) => w.id === selectedWallId);
        if (!wall) return;
        const snapped = snapPoint(pos);
        const dx = snapped.point.x - wall.x1;
        const dy = snapped.point.y - wall.y1;
        updateWall(selectedWallId, {
          x1: snapped.point.x, y1: snapped.point.y,
          x2: wall.x2 + dx, y2: wall.y2 + dy,
        });
        setMoveOffset({ x: pos.x - wall.x1, y: pos.y - wall.y1 });
      },
      onMouseUp: () => {
        setMoveOffset(null);
      },
    },

    // ── ROTATE ──
    rotate: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const fi = getFurnitureAtPoint(pos);
        if (fi) {
          updateFurniture(fi.id, { rotation: (fi.rotation + 45) % 360 });
        }
      },
    },

    // ── TRIM ──
    trim: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const clickedWall = getWallAtPoint(pos);
        if (!clickedWall) return;
        const a1: Point = { x: clickedWall.x1, y: clickedWall.y1 };
        const a2: Point = { x: clickedWall.x2, y: clickedWall.y2 };
        type IntPt = { point: Point; t: number; wall: Wall };
        const intersections: IntPt[] = [];
        const dx = clickedWall.x2 - clickedWall.x1;
        const dy = clickedWall.y2 - clickedWall.y1;
        const len2 = dx * dx + dy * dy;
        if (len2 < 1) return;
        for (const other of walls) {
          if (other.id === clickedWall.id) continue;
          const b1: Point = { x: other.x1, y: other.y1 };
          const b2: Point = { x: other.x2, y: other.y2 };
          const pt = segmentIntersection(a1, a2, b1, b2);
          if (pt) {
            const t = ((pt.x - clickedWall.x1) * dx + (pt.y - clickedWall.y1) * dy) / len2;
            if (t > 0.001 && t < 0.999) {
              intersections.push({ point: pt, t, wall: other });
            }
          }
        }
        if (intersections.length === 0) return;
        intersections.sort((a, b) => a.t - b.t);
        const clickT = ((pos.x - clickedWall.x1) * dx + (pos.y - clickedWall.y1) * dy) / len2;
        let segIdx = 0;
        for (let i = 0; i < intersections.length - 1; i++) {
          if (clickT > intersections[i].t && clickT < intersections[i + 1].t) {
            segIdx = i;
            break;
          }
        }
        if (clickT < intersections[0].t) {
          updateWall(clickedWall.id, { x1: intersections[0].point.x, y1: intersections[0].point.y });
        } else if (clickT > intersections[intersections.length - 1].t) {
          updateWall(clickedWall.id, { x2: intersections[intersections.length - 1].point.x, y2: intersections[intersections.length - 1].point.y });
        } else {
          const pts = [clickedWall.x1, clickedWall.y1];
          for (let i = 0; i < intersections.length; i++) {
            if (i !== segIdx && i !== segIdx + 1) {
              pts.push(intersections[i].point.x, intersections[i].point.y);
            }
          }
          pts.push(clickedWall.x2, clickedWall.y2);
          if (pts.length >= 4) {
            updateWall(clickedWall.id, { x1: pts[0], y1: pts[1], x2: pts[2], y2: pts[3] });
            for (let i = 4; i < pts.length; i += 2) {
              addWall({
                id: genId("wall"), x1: pts[i - 2], y1: pts[i - 1],
                x2: pts[i], y2: pts[i + 1],
                thickness: clickedWall.thickness, height: clickedWall.height,
                wallType: clickedWall.wallType, layer: clickedWall.layer,
              });
            }
          }
        }
      },
    },

    // ── EXTEND ──
    extend: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const clickedWall = getWallAtPoint(pos);
        if (!clickedWall) return;
        const dStart = distance(pos, { x: clickedWall.x1, y: clickedWall.y1 });
        const dEnd = distance(pos, { x: clickedWall.x2, y: clickedWall.y2 });
        const extendStart = dStart < dEnd;
        const origin: Point = extendStart
          ? { x: clickedWall.x1, y: clickedWall.y1 }
          : { x: clickedWall.x2, y: clickedWall.y2 };
        const dirX = extendStart
          ? (clickedWall.x1 - clickedWall.x2)
          : (clickedWall.x2 - clickedWall.x1);
        const dirY = extendStart
          ? (clickedWall.y1 - clickedWall.y2)
          : (clickedWall.y2 - clickedWall.y1);
        const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
        if (dirLen < 0.001) return;
        const ux = dirX / dirLen, uy = dirY / dirLen;
        let bestT = Infinity;
        let bestPt: Point | null = null;
        for (const other of walls) {
          if (other.id === clickedWall.id) continue;
          const oa: Point = { x: other.x1, y: other.y1 };
          const ob: Point = { x: other.x2, y: other.y2 };
          const oDx = ob.x - oa.x, oDy = ob.y - oa.y;
          const denom = ux * oDy - uy * oDx;
          if (Math.abs(denom) < 0.0001) continue;
          const t = ((oa.x - origin.x) * oDy - (oa.y - origin.y) * oDx) / denom;
          const u = ((oa.x - origin.x) * uy - (oa.y - origin.y) * ux) / -denom;
          if (t > 0.001 && u >= 0 && u <= 1 && t < bestT) {
            bestT = t;
            bestPt = { x: origin.x + t * ux, y: origin.y + t * uy };
          }
        }
        if (bestPt) {
          if (extendStart) {
            updateWall(clickedWall.id, { x1: bestPt.x, y1: bestPt.y });
          } else {
            updateWall(clickedWall.id, { x2: bestPt.x, y2: bestPt.y });
          }
        }
      },
    },

    // ── OFFSET ──
    offset: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          const offsetPx = offsetDistance * GRID_SIZE;
          const { nx, ny } = wallOffsetPoints(clickedWall.x1, clickedWall.y1, clickedWall.x2, clickedWall.y2, offsetPx);
          addWall({
            id: genId("wall"), x1: clickedWall.x1 + nx, y1: clickedWall.y1 + ny,
            x2: clickedWall.x2 + nx, y2: clickedWall.y2 + ny,
            thickness: getDefaultThickness(wallType), height: wallHeight, wallType,
            layer: activeLayer,
          });
        }
      },
    },

    // ── SPLIT ──
    split: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const wall = getWallAtPoint(pos);
        if (!wall) return;
        const dx = wall.x2 - wall.x1;
        const dy = wall.y2 - wall.y1;
        const len2 = dx * dx + dy * dy;
        if (len2 < 1) return;
        const t = Math.max(0.01, Math.min(0.99, ((pos.x - wall.x1) * dx + (pos.y - wall.y1) * dy) / len2));
        const splitX = wall.x1 + t * dx;
        const splitY = wall.y1 + t * dy;
        const newId = genId("wall");
        const wallOpenings = openings.filter((o) => o.wallId === wall.id);
        const store = useEditorStore.getState();
        for (const op of wallOpenings) {
          if (op.position > t) {
            store.updateOpening(op.id, { wallId: newId, position: (op.position - t) / (1 - t) });
          } else {
            store.updateOpening(op.id, { position: op.position / t });
          }
        }
        updateWall(wall.id, { x2: splitX, y2: splitY });
        addWall({
          id: newId, x1: splitX, y1: splitY,
          x2: wall.x2, y2: wall.y2,
          thickness: wall.thickness, height: wall.height, wallType: wall.wallType,
          layer: wall.layer,
        });
      },
    },

    // ── MIRROR ──
    mirror: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          const mx = (clickedWall.x1 + clickedWall.x2) / 2;
          updateWall(clickedWall.id, {
            x1: mx + (mx - clickedWall.x1),
            x2: mx + (mx - clickedWall.x2),
          });
        }
      },
    },

    // ── ERASER ──
    eraser: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const fi = getFurnitureAtPoint(pos);
        if (fi) { deleteFurniture(fi.id); return; }
        const lb = getLabelAtPoint(pos);
        if (lb) { deleteLabel(lb.id); return; }
        const cl = getColumnAtPoint(pos);
        if (cl) { deleteColumn(cl.id); return; }
        const aw = getArcWallAtPoint(pos);
        if (aw) { useEditorStore.getState().deleteArcWall(aw.id); return; }
        const cw = getCurtainWallAtPoint(pos);
        if (cw) { useEditorStore.getState().deleteCurtainWall(cw.id); return; }
        const sl = getSlabAtPoint(pos);
        if (sl) { useEditorStore.getState().deleteSlab(sl.id); return; }
        const op = getOpeningAtPoint(pos);
        if (op) { useEditorStore.getState().deleteOpening(op.id); return; }
        const wl = getWallAtPoint(pos);
        if (wl) { deleteWall(wl.id); return; }
      },
    },

    // ── WALL_SINGLE ──
    wall_single: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const sr = snapPoint(pos);
        const snapped = sr.point;
        if (!drawingStartRef.current) {
          drawingStartRef.current = snapped;
        } else {
          if (distance(drawingStartRef.current, snapped) > 5) {
            const thickness = getDefaultThickness(wallType);
            const aligned = getWallAlignedCoords(
              drawingStartRef.current.x, drawingStartRef.current.y,
              snapped.x, snapped.y, thickness
            );
            addWall({
              id: genId("wall"), x1: aligned.x1, y1: aligned.y1,
              x2: aligned.x2, y2: aligned.y2,
              thickness, height: wallHeight, wallType,
              layer: activeLayer,
            });
          }
          drawingStartRef.current = null;
        }
      },
      onMouseMove: (pos) => {
        if (drawingStartRef.current && mousePos) {
          setMousePos(pos);
        }
      },
    },

    // ── WALL_POLYLINE ──
    wall_polyline: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const sr = snapPoint(pos);
        const snapped = sr.point;
        if (polylinePoints.length === 0) {
          setPolylinePoints([snapped]);
        } else {
          const prev = polylinePoints[polylinePoints.length - 1];
          if (distance(prev, snapped) > 5) {
            const thickness = getDefaultThickness(wallType);
            const aligned = getWallAlignedCoords(prev.x, prev.y, snapped.x, snapped.y, thickness);
            addWall({
              id: genId("wall"), x1: aligned.x1, y1: aligned.y1,
              x2: aligned.x2, y2: aligned.y2,
              thickness, height: wallHeight, wallType,
              layer: activeLayer,
            });
            setPolylinePoints([...polylinePoints, snapped]);
          }
        }
      },
      onMouseMove: (pos) => {
        if (polylinePoints.length > 0 && mousePos) {
          setMousePos(pos);
        }
      },
    },

    // ── WALL_ARC ──
    wall_arc: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const sr = snapPoint(pos);
        const snapped = sr.point;
        if (arcWallPoints.length === 0) {
          setArcWallPoints([snapped]);
        } else if (arcWallPoints.length === 1) {
          setArcWallPoints([...arcWallPoints, snapped]);
        } else {
          const [c, s] = arcWallPoints;
          const e = snapped;
          const radius = distance(c, s);
          const startAngle = Math.atan2(s.y - c.y, s.x - c.x);
          const endAngle = Math.atan2(e.y - c.y, e.x - c.x);
          if (radius > 5) {
            const thickness = getDefaultThickness(wallType);
            addArcWallAction({
              id: genId("arc"), cx: c.x, cy: c.y, radius: radius / GRID_SIZE,
              startAngle, endAngle, thickness, height: wallHeight, wallType,
              layer: activeLayer,
            });
          }
          setArcWallPoints([]);
        }
      },
      onMouseMove: (pos) => {
        if (arcWallPoints.length > 0) setMousePos(pos);
      },
    },

    // ── ROOM_RECTANGLE ──
    room_rectangle: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const sr = snapPoint(pos);
        const snapped = sr.point;
        drawingStartRef.current = snapped;
      },
      onMouseMove: (pos) => {
        if (drawingStartRef.current) setMousePos(pos);
      },
      onMouseUp: (pos) => {
        if (!drawingStartRef.current) return;
        const start = drawingStartRef.current;
        const sr = snapPoint(pos);
        const end = sr.point;
        if (distance(start, end) > 10) {
          const { x: x1, y: y1 } = start;
          const { x: x2, y: y2 } = end;
          const t = getDefaultThickness(wallType);
          const align = (xx1: number, yy1: number, xx2: number, yy2: number) =>
            getWallAlignedCoords(xx1, yy1, xx2, yy2, t);
          const a1 = align(x1, y1, x2, y1);
          const a2 = align(x2, y1, x2, y2);
          const a3 = align(x2, y2, x1, y2);
          const a4 = align(x1, y2, x1, y1);
          const base = { thickness: t, height: wallHeight, wallType, layer: activeLayer };
          addWalls([
            { id: genId("wall"), x1: a1.x1, y1: a1.y1, x2: a1.x2, y2: a1.y2, ...base },
            { id: genId("wall"), x1: a2.x1, y1: a2.y1, x2: a2.x2, y2: a2.y2, ...base },
            { id: genId("wall"), x1: a3.x1, y1: a3.y1, x2: a3.x2, y2: a3.y2, ...base },
            { id: genId("wall"), x1: a4.x1, y1: a4.y1, x2: a4.x2, y2: a4.y2, ...base },
          ]);
        }
        drawingStartRef.current = null;
      },
    },

    // ── COLUMN_SQUARE ──
    column_square: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const snapped = getColumnSnapPosition({
          x: snapSize > 0 ? snapToGrid(pos.x, snapSize) : pos.x,
          y: snapSize > 0 ? snapToGrid(pos.y, snapSize) : pos.y,
        });
        addColumn({
          id: genId("col"), x: snapped.x, y: snapped.y,
          width: 0.3, depth: 0.3, height: wallHeight,
        });
      },
    },

    // ── COLUMN_CIRCULAR ──
    column_circular: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const snapped = getColumnSnapPosition({
          x: snapSize > 0 ? snapToGrid(pos.x, snapSize) : pos.x,
          y: snapSize > 0 ? snapToGrid(pos.y, snapSize) : pos.y,
        });
        addColumn({
          id: genId("col"), x: snapped.x, y: snapped.y,
          width: 0.35, depth: 0.35, height: wallHeight,
          isCircular: true,
        });
      },
    },

    // ── CURTAIN_WALL ──
    curtain_wall: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const sr = snapPoint(pos);
        drawingStartRef.current = sr.point;
      },
      onMouseUp: (pos) => {
        if (!drawingStartRef.current) return;
        const sr = snapPoint(pos);
        if (distance(drawingStartRef.current, sr.point) > 5) {
          addCurtainWall({
            id: genId("cw"),
            x1: drawingStartRef.current.x, y1: drawingStartRef.current.y,
            x2: sr.point.x, y2: sr.point.y,
            height: wallHeight, mullionSpacing: 1.2, panelWidth: 0.6,
            layer: activeLayer,
          });
        }
        drawingStartRef.current = null;
      },
    },

    // ── SLAB_FLOOR ──
    slab_floor: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const sr = snapPoint(pos);
        const snapped = sr.point;
        setAreaPolygonPoints([...areaPolygonPoints, snapped]);
      },
      onMouseMove: (pos) => {
        if (areaPolygonPoints.length > 0) setMousePos(pos);
      },
    },

    // ── DOOR_SINGLE ──
    door_single: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          const t = openingPositionOnWall(clickedWall, pos.x, pos.y);
          addOpening({
            id: genId("open"), wallId: clickedWall.id,
            type: "door", position: t, width: 0.9, height: 2.1, sillHeight: 0,
          });
        }
      },
    },

    // ── DOOR_DOUBLE ──
    door_double: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          const t = openingPositionOnWall(clickedWall, pos.x, pos.y);
          addOpening({
            id: genId("open"), wallId: clickedWall.id,
            type: "double_door", position: t, width: 1.6, height: 2.1, sillHeight: 0,
          });
        }
      },
    },

    // ── DOOR_SLIDING ──
    door_sliding: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          const t = openingPositionOnWall(clickedWall, pos.x, pos.y);
          addOpening({
            id: genId("open"), wallId: clickedWall.id,
            type: "sliding_door", position: t, width: 1.8, height: 2.1, sillHeight: 0,
          });
        }
      },
    },

    // ── WINDOW_STANDARD ──
    window_standard: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          const t = openingPositionOnWall(clickedWall, pos.x, pos.y);
          addOpening({
            id: genId("open"), wallId: clickedWall.id,
            type: "window", position: t, width: 1.2, height: 1.2, sillHeight: 0.9,
          });
        }
      },
    },

    // ── WINDOW_CORNER ──
    window_corner: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          const t = openingPositionOnWall(clickedWall, pos.x, pos.y);
          addOpening({
            id: genId("open"), wallId: clickedWall.id,
            type: "corner_window", position: t, width: 0.8, height: 1.5, sillHeight: 0.9,
          });
        }
      },
    },

    // ── WALL_OPENING ──
    wall_opening: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const clickedWall = getWallAtPoint(pos);
        if (clickedWall) {
          const t = openingPositionOnWall(clickedWall, pos.x, pos.y);
          addOpening({
            id: genId("open"), wallId: clickedWall.id,
            type: "wall_opening", position: t, width: 0.6, height: 0.6, sillHeight: 0,
          });
        }
      },
    },

    // ── DIMENSION_LINEAR ──
    dimension_linear: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const sr = snapPoint(pos);
        const snapped = sr.point;
        if (!drawingStartRef.current) {
          drawingStartRef.current = snapped;
        } else {
          if (distance(drawingStartRef.current, snapped) > 3) {
            addMeasureLine({
              id: genId("meas"),
              x1: drawingStartRef.current.x, y1: drawingStartRef.current.y,
              x2: snapped.x, y2: snapped.y,
            });
          }
          drawingStartRef.current = null;
        }
      },
      onMouseMove: (pos) => {
        if (drawingStartRef.current) setMousePos(pos);
      },
    },

    // ── DIMENSION_ANGLE ──
    dimension_angle: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const sr = snapPoint(pos);
        const snapped = sr.point;
        if (!dimensionAngleCenter) {
          setDimensionAngleCenter(snapped);
        } else if (!dimensionAngleStart) {
          setDimensionAngleStart(snapped);
        } else {
          const angle = angleBetweenPoints(dimensionAngleCenter, dimensionAngleStart, snapped);
          const radius = distance(dimensionAngleCenter, dimensionAngleStart);
          const sa = Math.atan2(dimensionAngleStart.y - dimensionAngleCenter.y, dimensionAngleStart.x - dimensionAngleCenter.x);
          const ea = Math.atan2(snapped.y - dimensionAngleCenter.y, snapped.x - dimensionAngleCenter.x);
          addAngularDimension({
            id: genId("ang"),
            centerX: dimensionAngleCenter.x, centerY: dimensionAngleCenter.y,
            radius, startAngle: sa, endAngle: ea,
          });
          setDimensionAngleCenter(null);
          setDimensionAngleStart(null);
        }
      },
      onMouseMove: (pos) => {
        if (dimensionAngleCenter) setMousePos(pos);
      },
    },

    // ── AREA_INSPECTOR ──
    area_inspector: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const sr = snapPoint(pos);
        setAreaPolygonPoints([...areaPolygonPoints, sr.point]);
      },
      onMouseMove: (pos) => {
        if (areaPolygonPoints.length > 0) setMousePos(pos);
      },
    },

    // ── TEXT_ANNOTATION ──
    text_annotation: {
      cursor: "text",
      onMouseDown: (pos) => {
        const text = window.prompt("Annotation text:", "Room") || "Room";
        addLabel({ id: genId("lbl"), x: pos.x, y: pos.y, text, rotation: 0 });
      },
    },

    // ── LEADER_ARROW ──
    leader_arrow: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const sr = snapPoint(pos);
        if (!leaderArrowStart) {
          setLeaderArrowStart(sr.point);
        } else {
          if (distance(leaderArrowStart, sr.point) > 3) {
            const text = window.prompt("Leader text (optional):", "") || "";
            addLeaderArrowAction({
              id: genId("lead"),
              x1: leaderArrowStart.x, y1: leaderArrowStart.y,
              x2: sr.point.x, y2: sr.point.y,
              text: text || undefined,
            });
          }
          setLeaderArrowStart(null);
        }
      },
      onMouseMove: (pos) => {
        if (leaderArrowStart) setMousePos(pos);
      },
    },

    // ── TAPE_MEASURE ──
    tape_measure: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        const sr = snapPoint(pos);
        const snapped = sr.point;
        if (tapeMeasurePoints.length === 0) {
          setTapeMeasurePoints([snapped]);
        } else {
          if (distance(tapeMeasurePoints[0], snapped) > 3) {
            addTapeMeasureLine({
              id: genId("meas"),
              x1: tapeMeasurePoints[0].x, y1: tapeMeasurePoints[0].y,
              x2: snapped.x, y2: snapped.y,
            });
          }
          setTapeMeasurePoints([tapeMeasurePoints[0], snapped]);
        }
      },
      onMouseMove: (pos) => {
        if (tapeMeasurePoints.length === 1) setMousePos(pos);
      },
    },

    // ── COLOR_FILL ──
    color_fill: {
      cursor: "crosshair",
      onMouseDown: (pos) => {
        function detectRoomPolygon(p: Point, ws: Wall[]): Point[] | null {
          const threshold = 20;
          type Edge = { wall: Wall; t: number; pt: Point };
          const edges: Edge[] = [];
          for (const w of ws) {
            const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
            const len2 = dx * dx + dy * dy;
            if (len2 < 1) continue;
            const t = ((p.x - w.x1) * dx + (p.y - w.y1) * dy) / len2;
            if (t < -0.2 || t > 1.2) continue;
            const px = w.x1 + t * dx, py = w.y1 + t * dy;
            const dist = distance(p, { x: px, y: py });
            if (dist < threshold && dist < GRID_SIZE * 2) {
              edges.push({ wall: w, t, pt: { x: px, y: py } });
            }
          }
          if (edges.length < 4) return null;
          edges.sort((a, b) => a.t - b.t);
          const ox = p.x, oy = p.y;
          const hitPts: Point[] = [];
          for (const e of edges) {
            const angle = Math.atan2(e.pt.y - oy, e.pt.x - ox);
            const dist2 = distance(p, e.pt);
            hitPts.push({ x: e.pt.x, y: e.pt.y });
          }
          if (hitPts.length < 4) return null;
          const hull: Point[] = [];
          let leftMost = hitPts[0];
          let leftIdx = 0;
          for (let i = 1; i < hitPts.length; i++) {
            if (hitPts[i].x < leftMost.x) { leftMost = hitPts[i]; leftIdx = i; }
          }
          let curr = leftIdx;
          let count = 0;
          do {
            hull.push(hitPts[curr]);
            let next = (curr + 1) % hitPts.length;
            for (let i = 0; i < hitPts.length; i++) {
              if (i === curr) continue;
              const cross = (hitPts[i].x - hitPts[curr].x) * (hitPts[next].y - hitPts[curr].y) -
                            (hitPts[i].y - hitPts[curr].y) * (hitPts[next].x - hitPts[curr].x);
              if (cross < 0) next = i;
            }
            curr = next;
            count++;
          } while (curr !== leftIdx && count < 20);
          if (hull.length < 3) return null;
          return hull;
        }
        const roomPoly = detectRoomPolygon(pos, walls);
        if (roomPoly) {
          addFloorFill({
            id: genId("fill"), points: roomPoly, fillType: "tile",
          });
        } else {
          const fillSize = 20;
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
        }
      },
    },

    // ── LAYER_TOGGLE ──
    layer_toggle: {
      cursor: "default",
      onMouseDown: () => {
        const store = useEditorStore.getState();
        const allOn = Object.values(store.visibleLayers).every(Boolean);
        const layerKeys: Array<keyof typeof store.visibleLayers> = ["walls", "openings", "columns", "furniture", "annotations", "fills", "grid"];
        if (allOn) {
          store.setLayerVisibility("grid", false);
        } else {
          for (const k of layerKeys) {
            store.setLayerVisibility(k, true);
          }
        }
      },
    },

    // ── GRID_CONFIG ──
    grid_config: {
      cursor: "default",
      onMouseDown: () => {
        const store = useEditorStore.getState();
        const sizes = [0, 5, 10, 25, 50];
        const idx = sizes.indexOf(store.snapSize);
        store.setSnapSize(sizes[(idx + 1) % sizes.length]);
      },
    },
  };

  // ─── Canvas Event Delegation ─────────────────────────────
  const getPos = (e: KonvaEventObject<MouseEvent>): Point => {
    const pos = getStagePos(e);
    const sr = snapPoint(pos);
    setSnapIndicator(sr);
    return pos;
  };

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (e.evt.button !== 0) return;
      const pos = getPos(e);

      if (activeFurnitureTemplate) {
        addFurniture({
          id: genId("furn"), name: activeFurnitureTemplate.name, category: "",
          x: pos.x, y: pos.y,
          width: activeFurnitureTemplate.width, height: activeFurnitureTemplate.height,
          rotation: 0, elevation: 0,
        });
        setActiveFurnitureTemplate(null);
        return;
      }

      const h = handlers[activeTool];
      if (h?.onMouseDown) h.onMouseDown(pos);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTool, activeFurnitureTemplate, walls, snapModes, snapSize, polylinePoints, arcWallPoints,
      dimensionAngleCenter, dimensionAngleStart, areaPolygonPoints, leaderArrowStart,
      tapeMeasurePoints]
  );

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const pos = getPos(e);
      setMousePos(pos);
      const h = handlers[activeTool];
      if (h?.onMouseMove) h.onMouseMove(pos);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTool, walls, snapModes, snapSize]
  );

  const handleMouseUp = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const pos = getPos(e);
      const h = handlers[activeTool];
      if (h?.onMouseUp) h.onMouseUp(pos);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTool, walls, snapModes, snapSize]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Enter" || e.key === " ") {
        if (activeTool === "slab_floor" && areaPolygonPoints.length >= 3) {
          addSlab({
            id: genId("slab"), points: [...areaPolygonPoints],
            thickness: 0.2, height: 0, layer: activeLayer,
          });
          setAreaPolygonPoints([]);
          return;
        }
        if (activeTool === "area_inspector" && areaPolygonPoints.length >= 3) {
          addAreaPolygon({ id: genId("area"), points: [...areaPolygonPoints] });
          setAreaPolygonPoints([]);
          return;
        }
        if (activeTool === "wall_polyline" && polylinePoints.length >= 2) {
          setPolylinePoints([]);
          return;
        }
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const state = useEditorStore.getState();
        if (state.selectedWallId) { state.deleteWall(state.selectedWallId); state.clearSelection(); }
        else if (state.selectedArcWallId) { state.deleteArcWall(state.selectedArcWallId); state.clearSelection(); }
        else if (state.selectedCurtainWallId) { state.deleteCurtainWall(state.selectedCurtainWallId); state.clearSelection(); }
        else if (state.selectedSlabId) { state.deleteSlab(state.selectedSlabId); state.clearSelection(); }
        else if (state.selectedFurnitureId) { state.deleteFurniture(state.selectedFurnitureId); state.clearSelection(); }
        else if (state.selectedColumnId) { state.deleteColumn(state.selectedColumnId); state.clearSelection(); }
        else if (state.selectedLabelId) { state.deleteLabel(state.selectedLabelId); state.clearSelection(); }
        else if (state.selectedOpeningId) { state.deleteOpening(state.selectedOpeningId); state.clearSelection(); }
      }
      if (e.key === "Escape") {
        resetDrawingState();
        drawingStartRef.current = null;
        clearSelection();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTool, areaPolygonPoints, polylinePoints]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ─── Grid ────────────────────────────────────────────────
  const landBoundX = GRID_SIZE;
  const landBoundY = GRID_SIZE;
  const landBoundW = landWidth * GRID_SIZE;
  const landBoundH = landLength * GRID_SIZE;

  const gridStep = snapSize > 0 ? snapSize : GRID_SIZE;
  const minorGridLines: { x: number; y: number; w: number; h: number }[] = [];
  const majorGridLines: { x: number; y: number; w: number; h: number }[] = [];
  if (gridVisible) {
    const step = Math.min(gridStep, 25);
    for (let x = 0; x < dimensions.width; x += step) {
      const arr = (x / step) % 5 === 0 ? majorGridLines : minorGridLines;
      arr.push({ x, y: 0, w: 1, h: dimensions.height });
    }
    for (let y = 0; y < dimensions.height; y += step) {
      const arr = (y / step) % 5 === 0 ? majorGridLines : minorGridLines;
      arr.push({ x: 0, y, w: dimensions.width, h: 1 });
    }
  }

  function renderGridLines(lines: { x: number; y: number; w: number; h: number }[], stroke: string, strokeWidth: number) {
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

  // ─── Snap indicator ──────────────────────────────────────
  const snapDot = snapIndicator && snapIndicator.type !== "none" && (
    <Circle x={snapIndicator.point.x} y={snapIndicator.point.y}
      radius={4} fill="#4ade80" stroke="#166534" strokeWidth={1.5} />
  );

  // ─── Drawing previews ────────────────────────────────────
  const wallPreview = activeTool === "wall_single" && drawingStartRef.current && mousePos && (
    <>
      <Line points={[drawingStartRef.current.x, drawingStartRef.current.y, mousePos.x, mousePos.y]}
        stroke="#4a7cff" strokeWidth={10} dash={[5, 5]} lineCap="round" />
      <Text x={(drawingStartRef.current.x + mousePos.x) / 2 - 20}
        y={(drawingStartRef.current.y + mousePos.y) / 2 - 12}
        text={`${(distance(drawingStartRef.current, mousePos) / GRID_SIZE).toFixed(2)} m`}
        fontSize={10} fill="#4a7cff" fontFamily="monospace" />
    </>
  );

  const roomPreview = activeTool === "room_rectangle" && drawingStartRef.current && mousePos && (
    <>
      <Line points={[
        drawingStartRef.current.x, drawingStartRef.current.y,
        mousePos.x, drawingStartRef.current.y,
        mousePos.x, mousePos.y,
        drawingStartRef.current.x, mousePos.y,
        drawingStartRef.current.x, drawingStartRef.current.y,
      ]} stroke="#4a7cff" strokeWidth={1} dash={[4, 4]} />
      <Text x={(drawingStartRef.current.x + mousePos.x) / 2 - 20}
        y={(drawingStartRef.current.y + mousePos.y) / 2 - 12}
        text={`${(Math.abs(mousePos.x - drawingStartRef.current.x) / GRID_SIZE).toFixed(1)} × ${(Math.abs(mousePos.y - drawingStartRef.current.y) / GRID_SIZE).toFixed(1)} m`}
        fontSize={10} fill="#4a7cff" fontFamily="monospace" />
    </>
  );

  const polylinePreview = activeTool === "wall_polyline" && polylinePoints.length > 0 && mousePos && (
    <>
      {polylinePoints.slice(0, -1).map((p, i) => (
        <Line key={i} points={[p.x, p.y, polylinePoints[i + 1].x, polylinePoints[i + 1].y]}
          stroke="#4a7cff" strokeWidth={10} lineCap="round" />
      ))}
      <Line points={[polylinePoints[polylinePoints.length - 1].x, polylinePoints[polylinePoints.length - 1].y, mousePos.x, mousePos.y]}
        stroke="#4a7cff" strokeWidth={10} dash={[5, 5]} lineCap="round" />
    </>
  );

  const arcPreview = activeTool === "wall_arc" && arcWallPoints.length === 1 && mousePos && (
    <Line points={[arcWallPoints[0].x, arcWallPoints[0].y, mousePos.x, mousePos.y]}
      stroke="#4a7cff" strokeWidth={2} dash={[4, 4]} />
  );

  const arcPreview2 = activeTool === "wall_arc" && arcWallPoints.length === 2 && mousePos && (
    <Circle x={arcWallPoints[0].x} y={arcWallPoints[0].y}
      radius={distance(arcWallPoints[0], arcWallPoints[1])}
      stroke="#4a7cff" strokeWidth={1.5} dash={[4, 4]} />
  );

  const measurePreview = activeTool === "dimension_linear" && drawingStartRef.current && mousePos && (
    <Group>
      <Line points={[drawingStartRef.current.x, drawingStartRef.current.y, mousePos.x, mousePos.y]}
        stroke="#f59e0b" strokeWidth={2} dash={[6, 3]} />
      <Circle x={drawingStartRef.current.x} y={drawingStartRef.current.y} radius={4} fill="#f59e0b" />
      <Text x={(drawingStartRef.current.x + mousePos.x) / 2 - 25}
        y={(drawingStartRef.current.y + mousePos.y) / 2 - 14}
        text={`${(distance(drawingStartRef.current, mousePos) / GRID_SIZE).toFixed(2)} m`}
        fontSize={11} fill="#f59e0b" fontFamily="monospace" />
    </Group>
  );

  const tapePreview = activeTool === "tape_measure" && tapeMeasurePoints.length === 1 && mousePos && (
    <Group>
      <Line points={[tapeMeasurePoints[0].x, tapeMeasurePoints[0].y, mousePos.x, mousePos.y]}
        stroke="#10b981" strokeWidth={2} dash={[6, 3]} />
      <Circle x={tapeMeasurePoints[0].x} y={tapeMeasurePoints[0].y} radius={4} fill="#10b981" />
      <Text x={(tapeMeasurePoints[0].x + mousePos.x) / 2 - 25}
        y={(tapeMeasurePoints[0].y + mousePos.y) / 2 - 14}
        text={`${(distance(tapeMeasurePoints[0], mousePos) / GRID_SIZE).toFixed(3)} m`}
        fontSize={11} fill="#10b981" fontFamily="monospace" />
    </Group>
  );

  const anglePreview = activeTool === "dimension_angle" && dimensionAngleCenter && dimensionAngleStart && mousePos && (
    <Group>
      <Line points={[dimensionAngleCenter.x, dimensionAngleCenter.y, dimensionAngleStart.x, dimensionAngleStart.y]}
        stroke="#f59e0b" strokeWidth={1.5} dash={[3, 3]} />
      <Line points={[dimensionAngleCenter.x, dimensionAngleCenter.y, mousePos.x, mousePos.y]}
        stroke="#f59e0b" strokeWidth={1.5} dash={[3, 3]} />
      <Circle x={dimensionAngleCenter.x} y={dimensionAngleCenter.y} radius={3} fill="#f59e0b" />
    </Group>
  );

  const areaPolyPreview = (activeTool === "area_inspector" || activeTool === "slab_floor") && areaPolygonPoints.length > 0 && mousePos && (
    <Group>
      <Line points={areaPolygonPoints.flatMap((p) => [p.x, p.y]).concat([mousePos.x, mousePos.y])}
        closed={areaPolygonPoints.length >= 3}
        stroke="#a855f7" strokeWidth={1.5} dash={[4, 4]}
        fill={areaPolygonPoints.length >= 3 ? "#a855f720" : undefined} />
      {areaPolygonPoints.map((p, i) => (
        <Circle key={i} x={p.x} y={p.y} radius={3} fill="#a855f7" />
      ))}
      {areaPolygonPoints.length >= 2 && (
        <Text x={mousePos.x + 8} y={mousePos.y - 8}
          text={`Area: ${(polygonArea([...areaPolygonPoints, mousePos]) / (GRID_SIZE * GRID_SIZE)).toFixed(2)} m²`}
          fontSize={10} fill="#a855f7" fontFamily="monospace" />
      )}
    </Group>
  );

  const leaderPreview = activeTool === "leader_arrow" && leaderArrowStart && mousePos && (
    <Line points={[leaderArrowStart.x, leaderArrowStart.y, mousePos.x, mousePos.y]}
      stroke="#f59e0b" strokeWidth={2} dash={[6, 3]} />
  );

  const tapeComplete = activeTool === "tape_measure" && tapeMeasurePoints.length === 2 && (
    <Group>
      <Line points={[tapeMeasurePoints[0].x, tapeMeasurePoints[0].y, tapeMeasurePoints[1].x, tapeMeasurePoints[1].y]}
        stroke="#10b981" strokeWidth={2} />
      <Circle x={tapeMeasurePoints[0].x} y={tapeMeasurePoints[0].y} radius={4} fill="#10b981" />
      <Circle x={tapeMeasurePoints[1].x} y={tapeMeasurePoints[1].y} radius={4} fill="#10b981" />
      <Text x={(tapeMeasurePoints[0].x + tapeMeasurePoints[1].x) / 2 - 30}
        y={(tapeMeasurePoints[0].y + tapeMeasurePoints[1].y) / 2 - 14}
        text={`${(distance(tapeMeasurePoints[0], tapeMeasurePoints[1]) / GRID_SIZE).toFixed(3)} m`}
        fontSize={11} fill="#10b981" fontFamily="monospace" />
    </Group>
  );

  const furniturePreview = activeFurnitureTemplate && mousePos && (
    <Rect
      x={mousePos.x - (activeFurnitureTemplate.width * GRID_SIZE) / 2}
      y={mousePos.y - (activeFurnitureTemplate.height * GRID_SIZE) / 2}
      width={activeFurnitureTemplate.width * GRID_SIZE}
      height={activeFurnitureTemplate.height * GRID_SIZE}
      fill="#4a7cff30" stroke="#4a7cff" strokeWidth={1.5} dash={[4, 4]} cornerRadius={3} />
  );

  const cursor = activeFurnitureTemplate ? "crosshair"
    : handlers[activeTool]?.cursor || "default";

  // ─── Render ────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative flex-1 bg-[#0f0f23] overflow-hidden" style={{ cursor }}>
      <Stage
        width={dimensions.width} height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e: KonvaEventObject<PointerEvent>) => {
          e.evt.preventDefault();
          resetDrawingState();
          drawingStartRef.current = null;
          clearSelection();
        }}
      >
        {visibleLayers.grid && <Layer>
          {renderGridLines(minorGridLines, "#1a1a3e", 0.5)}
          {renderGridLines(majorGridLines, "#2a2a5e", 1)}
        </Layer>}

        <Layer>
          <Line points={[landBoundX, landBoundY, landBoundX + landBoundW, landBoundY,
            landBoundX + landBoundW, landBoundY + landBoundH,
            landBoundX, landBoundY + landBoundH, landBoundX, landBoundY]}
            stroke="#4a7cff" strokeWidth={2} />
          <Text x={landBoundX + landBoundW / 2 - 30} y={landBoundY - 18}
            text={`${landWidth}m`} fontSize={10} fill="#4a7cff" fontFamily="monospace" />
          <Text x={landBoundX - 28} y={landBoundY + landBoundH / 2 - 6}
            text={`${landLength}m`} fontSize={10} fill="#4a7cff" fontFamily="monospace" />
        </Layer>

        {visibleLayers.fills && <Layer>
          {floorFills.map((fill) => {
            const pts: number[] = [];
            fill.points.forEach((p) => pts.push(p.x, p.y));
            const color = FILL_COLORS[fill.fillType] || FILL_COLORS.tile;
            const border = FILL_BORDER[fill.fillType] || FILL_BORDER.tile;
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
        </Layer>}

        {visibleLayers.walls && <Layer>
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
            const sw = 8 + (isExterior ? 3 : 0) + (isSelected ? 4 : 0);
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
        </Layer>}

        {visibleLayers.walls && <Layer>
          {arcWalls.map((aw) => {
            const isSelected = aw.id === selectedArcWallId;
            const r = aw.radius * GRID_SIZE;
            const pts: number[] = [];
            const steps = 32;
            const sa = Math.min(aw.startAngle, aw.endAngle);
            const ea = Math.max(aw.startAngle, aw.endAngle);
            for (let i = 0; i <= steps; i++) {
              const a = sa + (ea - sa) * (i / steps);
              pts.push(aw.cx + r * Math.cos(a), aw.cy + r * Math.sin(a));
            }
            return (
              <Group key={aw.id}>
                <Line points={pts} stroke={isSelected ? "#4a7cff" : "#6b7280"}
                  strokeWidth={10} lineCap="round" />
                {isSelected && (
                  <Circle x={aw.cx} y={aw.cy} radius={3} fill="#4a7cff" />
                )}
              </Group>
            );
          })}
        </Layer>}

        {visibleLayers.walls && <Layer>
          {curtainWalls.map((cw) => {
            const isSelected = cw.id === selectedCurtainWallId;
            const dx = cw.x2 - cw.x1;
            const dy = cw.y2 - cw.y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const segments = Math.max(2, Math.floor(len / (cw.mullionSpacing * GRID_SIZE)));
            const lines: number[] = [cw.x1, cw.y1, cw.x2, cw.y2];
            for (let i = 1; i < segments; i++) {
              const t = i / segments;
              lines.push(cw.x1 + t * dx, cw.y1 + t * dy,
                cw.x1 + t * dx + dy * 0.15, cw.y1 + t * dy - dx * 0.15);
            }
            return (
              <Line key={cw.id} points={lines}
                stroke={isSelected ? "#4a7cff" : "#60a5fa"} strokeWidth={2} />
            );
          })}
        </Layer>}

        {visibleLayers.walls && <Layer>
          {slabs.map((sl) => {
            const isSelected = sl.id === selectedSlabId;
            const pts: number[] = sl.points.flatMap((p) => [p.x, p.y]);
            const area = polygonArea(sl.points) / (GRID_SIZE * GRID_SIZE);
            const cx = sl.points.reduce((s, p) => s + p.x, 0) / sl.points.length;
            const cy = sl.points.reduce((s, p) => s + p.y, 0) / sl.points.length;
            return (
              <Group key={sl.id}>
                <Line points={pts} closed fill="#6b728030" stroke={isSelected ? "#4a7cff" : "#6b7280"}
                  strokeWidth={isSelected ? 2 : 1} />
                <Text x={cx - 20} y={cy - 5} text={`Slab ${area.toFixed(1)} m²`}
                  fontSize={9} fill="#9ca3af" fontFamily="monospace" />
              </Group>
            );
          })}
        </Layer>}

        {visibleLayers.openings && <Layer>
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
            const perpLen = opening.type === "door" || opening.type === "double_door" ? 15 : 12;
            const isSelected = opening.id === selectedOpeningId;
            const color = isSelected ? "#4a7cff"
              : opening.type === "door" || opening.type === "double_door" ? "#e8a87c"
              : opening.type === "sliding_door" ? "#7cc8e8"
              : opening.type === "corner_window" ? "#f5a623"
              : opening.type === "wall_opening" ? "#888"
              : "#7cc8e8";

            if (opening.type === "sliding_door") {
              return (
                <Group key={opening.id}>
                  <Line points={[px - halfW * (dx / len) - nx * 4, py - halfW * (dy / len) - ny * 4, px + halfW * (dx / len) - nx * 4, py + halfW * (dy / len) - ny * 4]} stroke={color} strokeWidth={2} />
                  <Line points={[px - halfW * (dx / len) + nx * 4, py - halfW * (dy / len) + ny * 4, px + halfW * (dx / len) + nx * 4, py + halfW * (dy / len) + ny * 4]} stroke={color} strokeWidth={2} />
                  <Line points={[px - halfW * (dx / len), py - halfW * (dy / len), px + halfW * (dx / len), py + halfW * (dy / len)]} stroke={color} strokeWidth={1} dash={[2, 2]} />
                </Group>
              );
            }

            if (opening.type === "door" || opening.type === "double_door") {
              const halfCount = opening.type === "double_door" ? 2 : 1;
              return (
                <Group key={opening.id}>
                  <Line points={[px - halfW * (dx / len), py - halfW * (dy / len), px + halfW * (dx / len), py + halfW * (dy / len)]} stroke={color} strokeWidth={2} />
                  <Line points={[px + halfW * (dx / len), py + halfW * (dy / len), px + halfW * (dx / len) + nx * perpLen, py + halfW * (dy / len) + ny * perpLen]} stroke={color} strokeWidth={2} />
                  {opening.type === "double_door" && (
                    <Line points={[px - halfW * (dx / len), py - halfW * (dy / len), px - halfW * (dx / len) - nx * perpLen, py - halfW * (dy / len) - ny * perpLen]} stroke={color} strokeWidth={2} />
                  )}
                </Group>
              );
            }

            if (opening.type === "corner_window") {
              return (
                <Group key={opening.id}>
                  <Line points={[px - halfW * (dx / len), py - halfW * (dy / len), px + halfW * (dx / len), py + halfW * (dy / len)]} stroke={color} strokeWidth={3} />
                  <Line points={[px, py, px + nx * 8, py + ny * 8]} stroke={color} strokeWidth={1.5} />
                </Group>
              );
            }

            if (opening.type === "wall_opening") {
              return (
                <Group key={opening.id}>
                  <Rect x={px - halfW - 3} y={py - 4} width={halfW * 2 + 6} height={8}
                    fill="#222" stroke={color} strokeWidth={1} cornerRadius={2} />
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
        </Layer>}

        {visibleLayers.columns && <Layer>
          {columns.map((col) => {
            const isSelected = col.id === selectedColumnId;
            const hw = (col.width * GRID_SIZE) / 2;
            const hd = (col.depth * GRID_SIZE) / 2;
            if (col.isCircular) {
              return (
                <Group key={col.id}>
                  <Circle x={col.x} y={col.y} radius={Math.min(hw, hd)}
                    fill={isSelected ? "#4a7cff" : "#6b7280"}
                    stroke={isSelected ? "#4a7cff" : "#4b5563"} strokeWidth={1.5} />
                  <Circle x={col.x} y={col.y} radius={Math.min(hw, hd) - 3}
                    fill="none" stroke={isSelected ? "#4a7cff" : "#9ca3af"} strokeWidth={0.5} />
                </Group>
              );
            }
            return (
              <Group key={col.id}>
                <Rect x={col.x - hw} y={col.y - hd} width={col.width * GRID_SIZE} height={col.depth * GRID_SIZE}
                  fill={isSelected ? "#4a7cff" : "#6b7280"} stroke={isSelected ? "#4a7cff" : "#4b5563"} strokeWidth={1.5} />
                <Rect x={col.x - hw + 3} y={col.y - hd + 3} width={col.width * GRID_SIZE - 6} height={col.depth * GRID_SIZE - 6}
                  fill="none" stroke={isSelected ? "#4a7cff" : "#9ca3af"} strokeWidth={0.5} />
              </Group>
            );
          })}
        </Layer>}

        {visibleLayers.annotations && <Layer>
          {labels.map((lbl) => {
            const isSelected = lbl.id === selectedLabelId;
            return (
              <Group key={lbl.id} x={lbl.x} y={lbl.y} rotation={lbl.rotation}>
                <Rect x={-lbl.text.length * 4 - 6} y={-9} width={lbl.text.length * 8 + 12} height={18}
                  fill={isSelected ? "#4a7cff20" : "#00000030"}
                  stroke={isSelected ? "#4a7cff" : "transparent"} strokeWidth={1} cornerRadius={3} />
                <Text text={lbl.text} fontSize={13} fill={isSelected ? "#4a7cff" : "#e0e0e0"}
                  fontFamily="monospace" fontStyle="bold" />
              </Group>
            );
          })}
        </Layer>}

        {visibleLayers.furniture && <Layer>
          {furniture.map((item) => {
            const isSelected = item.id === selectedFurnitureId;
            const hw = (item.width * GRID_SIZE) / 2;
            const hh = (item.height * GRID_SIZE) / 2;
            return (
              <Group key={item.id} x={item.x} y={item.y} rotation={item.rotation}>
                <Rect x={-hw} y={-hh} width={item.width * GRID_SIZE} height={item.height * GRID_SIZE}
                  fill={isSelected ? "#4a7cff" : "#3a3a5e"}
                  stroke={isSelected ? "#4a7cff" : "#6b7280"} strokeWidth={1} cornerRadius={3} />
                <Text x={-hw + 4} y={-hh + 2} text={item.name} fontSize={8} fill="#9ca3af"
                  fontFamily="monospace" width={item.width * GRID_SIZE - 8} />
              </Group>
            );
          })}
        </Layer>}

        {visibleLayers.annotations && <Layer>
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
          {tapeMeasureLines.map((line) => (
            <Group key={line.id}>
              <Line points={[line.x1, line.y1, line.x2, line.y2]} stroke="#10b981" strokeWidth={2} dash={[5, 3]} />
              <Circle x={line.x1} y={line.y1} radius={3} fill="#10b981" />
              <Circle x={line.x2} y={line.y2} radius={3} fill="#10b981" />
              <Text x={(line.x1 + line.x2) / 2 - 25} y={(line.y1 + line.y2) / 2 - 12}
                text={`${(distance({ x: line.x1, y: line.y1 }, { x: line.x2, y: line.y2 }) / GRID_SIZE).toFixed(2)} m`}
                fontSize={10} fill="#10b981" fontFamily="monospace" />
            </Group>
          ))}
        </Layer>}

        {visibleLayers.annotations && <Layer>
          {angularDimensions.map((ad) => {
            const pts: number[] = [];
            const steps = 24;
            const r = ad.radius;
            const sa = Math.min(ad.startAngle, ad.endAngle);
            const ea = Math.max(ad.startAngle, ad.endAngle);
            for (let i = 0; i <= steps; i++) {
              const a = sa + (ea - sa) * (i / steps);
              pts.push(ad.centerX + r * Math.cos(a), ad.centerY + r * Math.sin(a));
            }
            const midAngle = (sa + ea) / 2;
            return (
              <Group key={ad.id}>
                <Line points={pts} stroke="#f59e0b" strokeWidth={1.5} />
                <Text x={ad.centerX + (r + 10) * Math.cos(midAngle) - 15}
                  y={ad.centerY + (r + 10) * Math.sin(midAngle) - 8}
                  text={`${(Math.abs(ea - sa) * 180 / Math.PI).toFixed(1)}°`}
                  fontSize={10} fill="#f59e0b" fontFamily="monospace" />
              </Group>
            );
          })}
        </Layer>}

        {visibleLayers.annotations && <Layer>
          {leaderArrows.map((la) => {
            const dx = la.x2 - la.x1;
            const dy = la.y2 - la.y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = len > 0 ? dx / len : 0;
            const ny = len > 0 ? dy / len : 0;
            const ax = la.x2 - nx * 8 - ny * 4;
            const ay = la.y2 - ny * 8 + nx * 4;
            const bx = la.x2 - nx * 8 + ny * 4;
            const by = la.y2 - ny * 8 - nx * 4;
            return (
              <Group key={la.id}>
                <Line points={[la.x1, la.y1, la.x2, la.y2]} stroke="#f59e0b" strokeWidth={1.5} />
                <Line points={[la.x2, la.y2, ax, ay, bx, by, la.x2, la.y2]}
                  closed fill="#f59e0b" stroke="#f59e0b" strokeWidth={0.5} />
                {la.text && (
                  <Text x={(la.x1 + la.x2) / 2 + 6} y={(la.y1 + la.y2) / 2 - 8}
                    text={la.text} fontSize={10} fill="#f59e0b" fontFamily="monospace" />
                )}
              </Group>
            );
          })}
        </Layer>}

        {visibleLayers.annotations && <Layer>
          {areaPolygons.map((ap) => {
            const pts: number[] = ap.points.flatMap((p) => [p.x, p.y]);
            const area = polygonArea(ap.points) / (GRID_SIZE * GRID_SIZE);
            const cx = ap.points.reduce((s, p) => s + p.x, 0) / ap.points.length;
            const cy = ap.points.reduce((s, p) => s + p.y, 0) / ap.points.length;
            return (
              <Group key={ap.id}>
                <Line points={pts} closed fill="#a855f720" stroke="#a855f7" strokeWidth={1.5} />
                <Text x={cx - 20} y={cy - 5} text={`${area.toFixed(2)} m²`}
                  fontSize={11} fill="#a855f7" fontFamily="monospace" fontStyle="bold" />
              </Group>
            );
          })}
        </Layer>}

        <Layer>
          {snapDot}
          {wallPreview}
          {roomPreview}
          {polylinePreview}
          {arcPreview}
          {arcPreview2}
          {measurePreview}
          {tapePreview}
          {tapeComplete}
          {anglePreview}
          {areaPolyPreview}
          {leaderPreview}
          {furniturePreview}
        </Layer>
      </Stage>

      {walls.length === 0 && !drawingStartRef.current && !activeFurnitureTemplate && activeTool === "select" && (
        <div className="absolute inset-4 border border-dashed border-border rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-muted text-sm">2D Floor Plan Canvas</p>
            <p className="text-muted/50 text-xs mt-1">Select a drafting tool to start</p>
          </div>
        </div>
      )}

      {(activeTool === "tape_measure" && tapeMeasurePoints.length === 1) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-4 py-2 text-xs text-muted shadow-lg z-10">
          Click second point to complete tape measure
        </div>
      )}

      {(activeTool === "dimension_linear" && drawingStartRef.current) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-4 py-2 text-xs text-muted shadow-lg z-10">
          Click second point for dimension
        </div>
      )}

      {(activeTool === "area_inspector" && areaPolygonPoints.length > 0) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-4 py-2 text-xs text-muted shadow-lg z-10">
          Click to add points. Press <kbd className="text-accent">Enter</kbd> to close polygon
        </div>
      )}

      {(activeTool === "slab_floor" && areaPolygonPoints.length > 0) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-4 py-2 text-xs text-muted shadow-lg z-10">
          Click to add points. Press <kbd className="text-accent">Enter</kbd> to place slab
        </div>
      )}

      {(activeTool === "wall_polyline" && polylinePoints.length > 0) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-4 py-2 text-xs text-muted shadow-lg z-10">
          Click to add wall segments. Press <kbd className="text-accent">Enter</kbd> to finish
        </div>
      )}

      {activeFurnitureTemplate && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-4 py-2 text-xs text-muted shadow-lg z-10">
          Click to place <span className="text-accent font-medium">{activeFurnitureTemplate.name}</span>
          {" "}({activeFurnitureTemplate.width.toFixed(1)}×{activeFurnitureTemplate.height.toFixed(1)}m)
        </div>
      )}
    </div>
  );
}
