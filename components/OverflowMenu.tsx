"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, type LucideIcon } from "lucide-react";

export function OverflowMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="More options"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-pill text-ink hover:bg-chip"
      >
        <MoreVertical size={19} strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="absolute right-0 top-11 z-50 min-w-[11rem] overflow-hidden rounded-card border border-border bg-surface py-1 shadow-card"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  onClick,
  icon: Icon,
  children,
  danger = false,
  disabled = false,
}: {
  onClick?: () => void;
  icon?: LucideIcon;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium ${
        disabled
          ? "cursor-default text-muted-2"
          : `hover:bg-chip ${danger ? "text-danger" : "text-ink"}`
      }`}
    >
      {Icon && <Icon size={16} strokeWidth={2} />}
      {children}
    </button>
  );
}
