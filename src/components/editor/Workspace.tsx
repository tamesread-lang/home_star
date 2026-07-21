import FloorPlanCanvas from "./FloorPlanCanvas";
import ThreeScene from "@/components/three/ThreeScene";

export default function Workspace() {
  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between h-8 px-3 border-b border-border bg-surface-alt shrink-0">
          <span className="text-xs font-medium text-muted">Floor Plan (2D)</span>
        </div>
        <FloorPlanCanvas />
      </div>

      <div className="w-px bg-border" />

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between h-8 px-3 border-b border-border bg-surface-alt shrink-0">
          <span className="text-xs font-medium text-muted">3D Preview</span>
        </div>
        <ThreeScene />
      </div>
    </div>
  );
}
