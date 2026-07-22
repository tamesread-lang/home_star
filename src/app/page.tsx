"use client";

import { useEffect } from "react";
import TopNavBar from "@/components/editor/TopNavBar";
import ToolPalette from "@/components/editor/ToolPalette";
import CatalogPanel from "@/components/editor/CatalogPanel";
import Workspace from "@/components/editor/Workspace";
import InspectorPanel from "@/components/editor/InspectorPanel";
import { useEditorStore } from "@/store/editor-store";
import type { Tool } from "@/types/editor";

const KEY_MAP: Record<string, Tool> = {
  v: "select",
  g: "move_pan",
  r: "rotate",
  t: "trim",
  x: "extend",
  o: "offset",
  s: "split",
  m: "mirror",
  e: "eraser",
  w: "wall_single",
  y: "wall_polyline",
  a: "wall_arc",
  c: "column_square",
  u: "curtain_wall",
  d: "door_single",
  l: "dimension_linear",
  z: "area_inspector",
  n: "text_annotation",
  f: "tape_measure",
  h: "color_fill",
  k: "layer_toggle",
};

const SHIFT_KEY_MAP: Record<string, Tool> = {
  r: "room_rectangle",
  c: "column_circular",
  s: "slab_floor",
  d: "door_double",
  w: "door_sliding",
  z: "window_standard",
  x: "window_corner",
  o: "wall_opening",
  l: "dimension_angle",
  n: "leader_arrow",
  g: "grid_config",
};

export default function Home() {
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      const tool = e.shiftKey ? SHIFT_KEY_MAP[key] : KEY_MAP[key];

      if (tool) {
        setActiveTool(tool);
        e.preventDefault();
        return;
      }

      switch (e.key) {
        case "Escape": {
          const st = useEditorStore.getState();
          st.resetDrawingState();
          st.clearSelection();
          st.setActiveFurnitureTemplate(null);
          st.setActiveTool("select");
          e.preventDefault();
          break;
        }
        case "z":
        case "Z":
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              useEditorStore.getState().redo();
            } else {
              useEditorStore.getState().undo();
            }
            e.preventDefault();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveTool]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TopNavBar />
      <div className="flex flex-1 min-h-0">
        <ToolPalette />
        <CatalogPanel />
        <Workspace />
        <InspectorPanel />
      </div>
    </div>
  );
}
