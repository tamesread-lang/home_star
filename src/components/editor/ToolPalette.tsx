"use client";

import {
  MousePointer2, Eraser, Pencil, Square, DoorOpen, Scan, Armchair, Grid3x3,
} from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import { useEditorStore } from "@/store/editor-store";
import type { Tool } from "@/types/editor";

const tools: { id: Tool; icon: typeof MousePointer2; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "wall", icon: Pencil, label: "Wall (W)" },
  { id: "room", icon: Square, label: "Room" },
  { id: "door", icon: DoorOpen, label: "Door" },
  { id: "window", icon: Scan, label: "Window" },
  { id: "eraser", icon: Eraser, label: "Eraser (E)" },
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
    <aside className="flex flex-col items-center gap-2 w-14 py-3 border-r border-border bg-surface shrink-0">
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
