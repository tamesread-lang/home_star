import type { LucideIcon } from "lucide-react";

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export default function IconButton({ icon: Icon, label, active, onClick }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
        active
          ? "bg-accent text-white"
          : "text-muted hover:text-foreground hover:bg-surface-alt"
      }`}
    >
      <Icon size={20} />
    </button>
  );
}
