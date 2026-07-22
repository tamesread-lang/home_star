"use client";

import { useState } from "react";
import {
  MousePointer2, Move, RotateCw, Scissors, Expand, GitFork,
  Split, Copy, Eraser, Pencil, PenLine, Circle, Square,
  Columns3, CircleEllipsis, Grid3x3, PanelBottom, DoorOpen,
  DoorClosed, SlidersHorizontal, Scan, ScanLine, SquareDashed,
  Ruler, RulerIcon, Calculator, Type, ArrowUpRight,
  Crosshair, Droplet, Layers, Settings2, ChevronRight, ChevronDown,
} from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import { useEditorStore } from "@/store/editor-store";
import type { Tool, ToolCategory } from "@/types/editor";
import { TOOL_LABELS, TOOL_SHORTCUTS, TOOL_CATEGORIES } from "@/constants/editor";

const CATEGORIES: ToolCategory[] = ["drafting", "openings", "modify", "annotations", "utilities"];

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  drafting: "Drafting",
  openings: "Openings",
  modify: "Modify",
  annotations: "Annotate",
  utilities: "Utility",
};

const CATEGORY_ICONS: Record<ToolCategory, typeof MousePointer2> = {
  drafting: Pencil,
  openings: DoorOpen,
  modify: Scissors,
  annotations: Ruler,
  utilities: Settings2,
};

function getToolIcon(tool: Tool) {
  const icons: Record<string, typeof MousePointer2> = {
    select: MousePointer2,
    move_pan: Move,
    rotate: RotateCw,
    trim: Scissors,
    extend: Expand,
    offset: GitFork,
    split: Split,
    mirror: Copy,
    eraser: Eraser,
    wall_single: Pencil,
    wall_polyline: PenLine,
    wall_arc: Circle,
    room_rectangle: Square,
    column_square: Columns3,
    column_circular: CircleEllipsis,
    curtain_wall: Grid3x3,
    slab_floor: PanelBottom,
    door_single: DoorOpen,
    door_double: DoorClosed,
    door_sliding: SlidersHorizontal,
    window_standard: Scan,
    window_corner: ScanLine,
    wall_opening: SquareDashed,
    dimension_linear: Ruler,
    dimension_angle: RulerIcon,
    area_inspector: Calculator,
    text_annotation: Type,
    leader_arrow: ArrowUpRight,
    tape_measure: Crosshair,
    color_fill: Droplet,
    layer_toggle: Layers,
    grid_config: Settings2,
  };
  return icons[tool] || MousePointer2;
}

export default function ToolPalette() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const activeCategory = useEditorStore((s) => s.activeCategory);
  const gridVisible = useEditorStore((s) => s.gridVisible);
  const catalogVisible = useEditorStore((s) => s.catalogVisible);
  const snapSize = useEditorStore((s) => s.snapSize);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setActiveCategory = useEditorStore((s) => s.setActiveCategory);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const setCatalogVisible = useEditorStore((s) => s.setCatalogVisible);
  const setActiveFurnitureTemplate = useEditorStore((s) => s.setActiveFurnitureTemplate);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    drafting: false,
    openings: true,
    modify: true,
    annotations: true,
    utilities: true,
  });

  const toggleCategory = (catId: string) => {
    setCollapsed((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleToolClick = (tool: Tool, catId: ToolCategory) => {
    setActiveFurnitureTemplate(null);
    setActiveTool(tool);
    setActiveCategory(catId);
  };

  return (
    <aside className="flex flex-col gap-0 w-14 py-2 border-r border-border bg-[#12121e] shrink-0 overflow-y-auto">
      {CATEGORIES.map((catId) => {
        const catTools = TOOL_CATEGORIES[catId];
        const isActive = activeCategory === catId;
        const isCollapsed = collapsed[catId];
        const CatIcon = CATEGORY_ICONS[catId];

        return (
          <div key={catId} className="mb-0.5">
            <button
              onClick={() => toggleCategory(catId)}
              className={`flex items-center justify-between w-full px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider transition-all duration-150 border-l-2 ${
                isActive
                  ? "text-blue-400 bg-blue-500/10 border-l-blue-500"
                  : "text-muted hover:text-foreground hover:bg-white/[0.03] border-l-transparent"
              }`}
              title={CATEGORY_LABELS[catId]}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <CatIcon size={12} className="shrink-0" />
                <span className="truncate">{CATEGORY_LABELS[catId]}</span>
              </div>
              {isCollapsed ? <ChevronRight size={10} className="shrink-0" /> : <ChevronDown size={10} className="shrink-0" />}
            </button>

            {!isCollapsed && (
              <div className="grid grid-cols-2 gap-0.5 px-1.5 py-1">
                {catTools.map((tool) => {
                  const shortcut = TOOL_SHORTCUTS[tool];
                  const label = TOOL_LABELS[tool];
                  return (
                    <IconButton
                      key={tool}
                      icon={getToolIcon(tool)}
                      label={label}
                      shortcut={shortcut}
                      active={activeTool === tool}
                      size="sm"
                      onClick={() => handleToolClick(tool, catId)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="mx-3 my-1.5 h-px bg-border/50" />

      <div className="flex flex-col items-center gap-0.5 px-1.5">
        <IconButton
          icon={Grid3x3}
          label={`Grid ${gridVisible ? "ON" : "OFF"}`}
          shortcut={`${(snapSize / 50).toFixed(snapSize < 25 ? 1 : 0)}m`}
          active={gridVisible}
          size="sm"
          onClick={toggleGrid}
        />
        <IconButton
          icon={Layers}
          label={catalogVisible ? "Close Catalog" : "Furniture Catalog"}
          active={catalogVisible}
          size="sm"
          onClick={() => setCatalogVisible(!catalogVisible)}
        />
      </div>
    </aside>
  );
}
