"use client";

import type { LucideIcon } from "lucide-react";

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  active?: boolean;
  size?: "sm" | "md";
  onClick?: () => void;
}

export default function IconButton({ icon: Icon, label, shortcut, active, size = "md", onClick }: IconButtonProps) {
  const dim = size === "sm" ? "w-9 h-9" : "w-10 h-10";
  const iconSize = size === "sm" ? 16 : 20;
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`flex items-center justify-center ${dim} rounded-lg transition-all duration-150
          ${active
            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400"
            : "text-muted hover:text-foreground hover:bg-white/5 active:bg-white/10"
          }`}
      >
        <Icon size={iconSize} />
      </button>
      <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50
        opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap">
        <div className="flex items-center gap-2 bg-[#1e1e2e] border border-[#3a3a5e] rounded-lg px-3 py-1.5 shadow-xl">
          <span className="text-xs font-medium text-foreground">{label}</span>
          {shortcut && (
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#2a2a4a] text-muted border border-[#3a3a5e] leading-none">
              {shortcut}
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
}
