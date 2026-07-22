import type { Tool, ToolCategory, WallType, FurnitureTemplate } from "@/types/editor";

export const FURNITURE_CATALOG: Record<string, FurnitureTemplate[]> = {
  "Living Room": [
    { name: "L-Shape Sofa", width: 2.5, height: 1.8 },
    { name: "Armchair", width: 0.9, height: 0.9 },
    { name: "Coffee Table", width: 1.2, height: 0.6 },
    { name: "TV Console", width: 1.8, height: 0.5 },
    { name: "Bookshelf", width: 0.8, height: 0.4 },
  ],
  "Bedroom": [
    { name: "King Bed", width: 2.0, height: 2.0 },
    { name: "Queen Bed", width: 1.6, height: 2.0 },
    { name: "Single Bed", width: 1.0, height: 2.0 },
    { name: "Wardrobe", width: 1.5, height: 0.6 },
    { name: "Nightstand", width: 0.5, height: 0.5 },
  ],
  "Kitchen": [
    { name: "L-Counter", width: 2.0, height: 1.5 },
    { name: "Kitchen Island", width: 1.8, height: 0.9 },
    { name: "Fridge", width: 0.8, height: 0.8 },
    { name: "Gas Stove", width: 0.9, height: 0.6 },
    { name: "Dining Table 6-Chair", width: 1.8, height: 0.9 },
  ],
  "Bathroom": [
    { name: "Bathtub", width: 1.7, height: 0.75 },
    { name: "Shower Cabin", width: 1.0, height: 1.0 },
    { name: "Toilet", width: 0.5, height: 0.7 },
    { name: "Vanity Sink", width: 1.0, height: 0.5 },
  ],
  "Architectural": [
    { name: "Straight Stairs", width: 3.0, height: 1.0 },
    { name: "L-Shape Stairs", width: 2.5, height: 2.5 },
    { name: "Car Garage", width: 3.0, height: 6.0 },
  ],
};

export const TOOL_SHORTCUTS: Record<Tool, string> = {
  select: "V",
  move_pan: "G",
  rotate: "R",
  trim: "T",
  extend: "X",
  offset: "O",
  split: "S",
  mirror: "M",
  eraser: "E",
  wall_single: "W",
  wall_polyline: "Y",
  wall_arc: "A",
  room_rectangle: "Shift+R",
  column_square: "C",
  column_circular: "Shift+C",
  curtain_wall: "U",
  slab_floor: "Shift+S",
  door_single: "D",
  door_double: "Shift+D",
  door_sliding: "Shift+W",
  window_standard: "Shift+Z",
  window_corner: "Shift+X",
  wall_opening: "Shift+O",
  dimension_linear: "L",
  dimension_angle: "Shift+L",
  area_inspector: "Z",
  text_annotation: "N",
  leader_arrow: "Shift+N",
  tape_measure: "F",
  color_fill: "H",
  layer_toggle: "K",
  grid_config: "Shift+G",
};

export const TOOL_LABELS: Record<Tool, string> = {
  select: "Select",
  move_pan: "Move/Pan",
  rotate: "Rotate",
  trim: "Trim",
  extend: "Extend",
  offset: "Offset",
  split: "Split",
  mirror: "Mirror",
  eraser: "Eraser",
  wall_single: "Single Wall",
  wall_polyline: "Polyline Wall",
  wall_arc: "Arc Wall",
  room_rectangle: "Rectangular Room",
  column_square: "Square Column",
  column_circular: "Circular Column",
  curtain_wall: "Curtain Wall",
  slab_floor: "Floor Slab",
  door_single: "Single Door",
  door_double: "Double Door",
  door_sliding: "Sliding Door",
  window_standard: "Standard Window",
  window_corner: "Corner Window",
  wall_opening: "Wall Opening",
  dimension_linear: "Linear Dimension",
  dimension_angle: "Angular Dimension",
  area_inspector: "Area Inspector",
  text_annotation: "Text Annotation",
  leader_arrow: "Leader Arrow",
  tape_measure: "Tape Measure",
  color_fill: "Color Fill",
  layer_toggle: "Layer Toggle",
  grid_config: "Grid Config",
};

export const TOOL_CATEGORIES: Record<ToolCategory, Tool[]> = {
  drafting: ["wall_single", "wall_polyline", "wall_arc", "room_rectangle", "column_square", "column_circular", "curtain_wall", "slab_floor"],
  openings: ["door_single", "door_double", "door_sliding", "window_standard", "window_corner", "wall_opening"],
  modify: ["select", "move_pan", "rotate", "trim", "extend", "offset", "split", "mirror", "eraser"],
  annotations: ["dimension_linear", "dimension_angle", "area_inspector", "text_annotation", "leader_arrow"],
  utilities: ["tape_measure", "color_fill", "layer_toggle", "grid_config"],
};

export function getDefaultThickness(wallType: WallType): number {
  return wallType === "exterior" ? 0.3 : 0.15;
}

export const GRID_SIZE = 50;
export const SNAP_THRESHOLD = 12;
