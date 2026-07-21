"use client";

import { useEditorStore } from "@/store/editor-store";
import { FURNITURE_CATALOG } from "@/types/editor";
import type { FurnitureTemplate } from "@/types/editor";
import { useState } from "react";

const CATEGORY_ICONS: Record<string, string> = {
  "Living Room": "🛋",
  Bedroom: "🛏",
  Bathroom: "🚿",
  Kitchen: "🍳",
};

export default function CatalogPanel() {
  const catalogVisible = useEditorStore((s) => s.catalogVisible);
  const activeFurnitureTemplate = useEditorStore(
    (s) => s.activeFurnitureTemplate
  );
  const setActiveFurnitureTemplate = useEditorStore(
    (s) => s.setActiveFurnitureTemplate
  );
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const [openCategory, setOpenCategory] = useState<string | null>("Living Room");

  if (!catalogVisible) return null;

  const handleSelect = (template: FurnitureTemplate) => {
    setActiveFurnitureTemplate(template);
    setActiveTool("select");
  };

  return (
    <div className="w-52 border-r border-border bg-surface shrink-0 overflow-y-auto">
      <div className="px-3 py-2 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Furniture Catalog
        </h3>
      </div>
      <div className="p-2 space-y-1">
        {Object.entries(FURNITURE_CATALOG).map(([category, items]) => (
          <div key={category}>
            <button
              onClick={() =>
                setOpenCategory(openCategory === category ? null : category)
              }
              className={`w-full text-left text-xs font-medium px-2 py-1.5 rounded flex items-center gap-2 ${
                openCategory === category
                  ? "bg-surface-alt text-foreground"
                  : "text-muted hover:text-foreground hover:bg-surface-alt"
              }`}
            >
              <span>{CATEGORY_ICONS[category] || "📦"}</span>
              {category}
            </button>
            {openCategory === category && (
              <div className="ml-2 mt-1 space-y-1">
                {items.map((item) => {
                  const isActive =
                    activeFurnitureTemplate?.name === item.name &&
                    activeFurnitureTemplate?.width === item.width;
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleSelect(item)}
                      className={`w-full text-xs px-2 py-1.5 rounded flex items-center justify-between ${
                        isActive
                          ? "bg-accent/20 text-accent border border-accent/30"
                          : "text-muted hover:text-foreground hover:bg-surface-alt border border-transparent"
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className="text-[10px] opacity-60">
                        {item.width.toFixed(1)}×{item.height.toFixed(1)}m
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        <div className="pt-2 text-[10px] text-muted/50 text-center">
          {activeFurnitureTemplate
            ? "Click on the 2D canvas to place"
            : "Select an item to place"}
        </div>
      </div>
    </div>
  );
}
