import type { LucideIcon } from "lucide-react";

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  size?: "sm" | "md";
  onClick?: () => void;
}

export default function IconButton({ icon: Icon, label, active, size = "md", onClick }: IconButtonProps) {
  const dim = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconSize = size === "sm" ? 16 : 20;
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center justify-center ${dim} rounded-lg transition-colors ${
        active
          ? "bg-accent text-white"
          : "text-muted hover:text-foreground hover:bg-surface-alt"
      }`}
    >
      <Icon size={iconSize} />
    </button>
  );
}
