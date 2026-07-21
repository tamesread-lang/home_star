"use client";

import { Undo2, Redo2, Download } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import { useEditorStore } from "@/store/editor-store";

export default function TopNavBar() {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-surface shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">HomeStar</h1>
        <span className="text-xs text-muted">Architectural CAD</span>
      </div>

      <div className="flex items-center gap-1">
        <IconButton
          icon={Undo2}
          label="Undo"
          onClick={undo}
        />
        <IconButton
          icon={Redo2}
          label="Redo"
          onClick={redo}
        />
      </div>

      <button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors">
        <Download size={16} />
        Export
      </button>
    </header>
  );
}
