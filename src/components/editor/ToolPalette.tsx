"use client";

import {
  MousePointer2, Eraser, Pencil, Square, Columns3,
  DoorOpen, Scan, Type, Ruler, RotateCw, Armchair, Grid3x3,
  SlidersHorizontal, Copy, Scissors, GitFork, Droplet,
} from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import { useEditorStore } from "@/store/editor-store";
import type { Tool } from "@/types/editor";

const tools: { id: Tool; icon: typeof MousePointer2; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "wall", icon: Pencil, label: "Wall (W)" },
  { id: "room", icon: Square, label: "Room Box" },
  { id: "column", icon: Columns3, label: "Column" },
  { id: "door", icon: DoorOpen, label: "Door" },
  { id: "sliding_door", icon: SlidersHorizontal, label: "Sliding Door" },
  { id: "window", icon: Scan, label: "Window" },
  { id: "label", icon: Type, label: "Label (T)" },
  { id: "measure", icon: Ruler, label: "Measure (M)" },
  { id: "rotate", icon: RotateCw, label: "Rotate (R)" },
  { id: "eraser", icon: Eraser, label: "Eraser (E)" },
];

const actionTools: { id: Tool; icon: typeof MousePointer2; label: string }[] = [
  { id: "mirror", icon: Copy, label: "Mirror" },
  { id: "trim", icon: Scissors, label: "Trim/Cut" },
  { id: "offset", icon: GitFork, label: "Offset" },
  { id: "fill", icon: Droplet, label: "Room Fill" },
];

export default function ToolPalette() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const gridVisible = useEditorStore((s) => s.gridVisible);
  const catalogVisible = useEditorStore((s) => s.catalogVisible);
  const snapSize = useEditorStore((s) => s.snapSize);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const setCatalogVisible = useEditorStore((s) => s.setCatalogVisible);
  const setActiveFurnitureTemplate = useEditorStore(
    (s) => s.setActiveFurnitureTemplate
  );

  return (
    <aside className="flex flex-col items-center gap-2 w-14 py-3 border-r border-border bg-surface shrink-0 overflow-y-auto">
      {tools.map((tool) => (
        <IconButton
          key={tool.id}
          icon={tool.icon}
          label={tool.label}
          active={activeTool === tool.id}
          onClick={() => {
            setActiveFurnitureTemplate(null);
            setActiveTool(tool.id);
          }}
        />
      ))}

      <div className="w-8 h-px bg-border my-1" />

      {actionTools.map((tool) => (
        <IconButton
          key={tool.id}
          icon={tool.icon}
          label={tool.label}
          active={activeTool === tool.id}
          onClick={() => {
            setActiveFurnitureTemplate(null);
            setActiveTool(tool.id);
          }}
        />
      ))}

      <div className="w-8 h-px bg-border my-1" />

      <IconButton
        icon={Armchair}
        label={catalogVisible ? "Close Catalog" : "Furniture"}
        active={catalogVisible}
        onClick={() => {
          setCatalogVisible(!catalogVisible);
        }}
      />

      <IconButton
        icon={Grid3x3}
        label={`Grid ${gridVisible ? "ON" : "OFF"} (Snap: ${
          snapSize > 0 ? `${(snapSize / 50).toFixed(snapSize < 25 ? 1 : 0)}m` : "Free"
        })`}
        active={gridVisible}
        onClick={toggleGrid}
      />
    </aside>
  );
}
