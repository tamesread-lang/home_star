"use client";

import { MousePointer2, Eraser, Pencil, Ruler, Grid3X3 } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import { useEditorStore } from "@/store/editor-store";
import type { Tool } from "@/types/editor";

const tools: { id: Tool; icon: typeof MousePointer2; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "wall", icon: Pencil, label: "Wall (W)" },
  { id: "eraser", icon: Eraser, label: "Eraser (E)" },
  { id: "dimension", icon: Ruler, label: "Dimension (D)" },
];

export default function ToolPalette() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const gridVisible = useEditorStore((s) => s.gridVisible);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);

  return (
    <aside className="flex flex-col items-center gap-2 w-14 py-3 border-r border-border bg-surface shrink-0">
      {tools.map((tool) => (
        <IconButton
          key={tool.id}
          icon={tool.icon}
          label={tool.label}
          active={activeTool === tool.id}
          onClick={() => setActiveTool(tool.id)}
        />
      ))}

      <div className="w-8 h-px bg-border my-1" />

      <IconButton
        icon={Grid3X3}
        label="Toggle Grid"
        active={gridVisible}
        onClick={toggleGrid}
      />
    </aside>
  );
}
