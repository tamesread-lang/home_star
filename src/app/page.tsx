"use client";

import { useEffect } from "react";
import TopNavBar from "@/components/editor/TopNavBar";
import ToolPalette from "@/components/editor/ToolPalette";
import CatalogPanel from "@/components/editor/CatalogPanel";
import Workspace from "@/components/editor/Workspace";
import InspectorPanel from "@/components/editor/InspectorPanel";
import { useEditorStore } from "@/store/editor-store";

export default function Home() {
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case "v":
          setActiveTool("select");
          break;
        case "w":
          setActiveTool("wall");
          break;
        case "e":
          setActiveTool("eraser");
          break;
        case "d":
          setActiveTool("dimension");
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            const store = useEditorStore.getState();
            if (e.shiftKey) {
              store.redo();
            } else {
              store.undo();
            }
            e.preventDefault();
          }
          break;
        case "escape":
          useEditorStore.getState().clearSelection();
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
