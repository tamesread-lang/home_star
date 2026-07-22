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
import { TOOL_LABELS, TOOL_SHORTCUTS, TOOL_CATEGORIES } from "@/types/editor";

interface CategoryConfig {
  id: ToolCategory;
  label: string;
  tools: Tool[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: "drafting",
    label: "Drafting",
    tools: TOOL_CATEGORIES.drafting,
  },
  {
    id: "openings",
    label: "Openings",
    tools: TOOL_CATEGORIES.openings,
  },
  {
    id: "modify",
    label: "Modify",
    tools: TOOL_CATEGORIES.modify,
  },
  {
    id: "annotations",
    label: "Annotations",
    tools: TOOL_CATEGORIES.annotations,
  },
  {
    id: "utilities",
    label: "Utilities",
    tools: TOOL_CATEGORIES.utilities,
  },
];

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
  const setActiveFurnitureTemplate = useEditorStore(
    (s) => s.setActiveFurnitureTemplate
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    drafting: false,
    openings: false,
    modify: false,
    annotations: false,
    utilities: false,
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
    <aside className="flex flex-col items-stretch gap-0 w-16 py-2 border-r border-border bg-surface shrink-0 overflow-y-auto">
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.id;
        const isCollapsed = collapsed[cat.id];
        return (
          <div key={cat.id} className="mb-1">
            <button
              onClick={() => toggleCategory(cat.id)}
              className={`flex items-center gap-1 w-full px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                isActive
                  ? "text-accent bg-accent/10"
                  : "text-muted hover:text-foreground"
              }`}
              title={cat.label}
            >
              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span>{cat.label}</span>
            </button>
            {!isCollapsed && (
              <div className="flex flex-col items-center gap-0.5 px-1">
                {cat.tools.map((tool) => {
                  const shortcut = TOOL_SHORTCUTS[tool];
                  const label = TOOL_LABELS[tool];
                  const tooltip = `${label}${shortcut ? ` (${shortcut})` : ""}`;
                  return (
                    <IconButton
                      key={tool}
                      icon={getToolIcon(tool)}
                      label={tooltip}
                      active={activeTool === tool}
                      size="sm"
                      onClick={() => handleToolClick(tool, cat.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="w-10 h-px bg-border my-2 mx-auto" />

      <div className="flex flex-col items-center gap-1 px-2">
        <IconButton
          icon={Grid3x3}
          label={`Grid ${gridVisible ? "ON" : "OFF"} (${
            snapSize > 0
              ? `${(snapSize / 50).toFixed(snapSize < 25 ? 1 : 0)}m snap`
              : "Free snap"
          })`}
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
