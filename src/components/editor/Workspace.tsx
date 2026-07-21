"use client";

import FloorPlanCanvas from "./FloorPlanCanvas";
import ThreeScene from "@/components/three/ThreeScene";
import { useEditorStore } from "@/store/editor-store";

export default function Workspace() {
  const is3DFullscreen = useEditorStore((s) => s.is3DFullscreen);

  return (
    <div className="flex flex-1 min-h-0">
      {!is3DFullscreen && (
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between h-8 px-3 border-b border-border bg-surface-alt shrink-0">
            <span className="text-xs font-medium text-muted">Floor Plan (2D)</span>
          </div>
          <FloorPlanCanvas />
        </div>
      )}

      {!is3DFullscreen && <div className="w-px bg-border" />}

      <div className={`flex flex-col min-w-0 ${is3DFullscreen ? "flex-1" : "flex-1"}`}>
        <div className="flex items-center justify-between h-8 px-3 border-b border-border bg-surface-alt shrink-0">
          <span className="text-xs font-medium text-muted">3D Preview</span>
        </div>
        <ThreeScene />
      </div>
    </div>
  );
}
