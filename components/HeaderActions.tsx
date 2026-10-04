"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Pencil, LogOut } from "lucide-react";
import { NotificationsBell } from "@/components/NotificationsBell";
import { OverflowMenu, MenuItem } from "@/components/OverflowMenu";

// Top-right header cluster: optional notifications bell (players) + a ⋮ menu
// with the theme switch, an optional Edit item, and Sign out.
export function HeaderActions({
  showBell = false,
  onEdit,
  editLabel = "Edit",
}: {
  showBell?: boolean;
  onEdit?: () => void;
  editLabel?: string;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const current =
      (document.documentElement.getAttribute("data-theme") as
        | "light"
        | "dark"
        | null) ?? "dark";
    setTheme(current);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("athletx-theme", next);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="-mr-1.5 flex items-center gap-0.5">
      {showBell && <NotificationsBell />}
      <OverflowMenu>
        <MenuItem icon={theme === "dark" ? Sun : Moon} onClick={toggleTheme}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </MenuItem>
        {onEdit && (
          <MenuItem icon={Pencil} onClick={onEdit}>
            {editLabel}
          </MenuItem>
        )}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-danger hover:bg-chip"
          >
            <LogOut size={16} strokeWidth={2} />
            Sign out
          </button>
        </form>
      </OverflowMenu>
    </div>
  );
}
