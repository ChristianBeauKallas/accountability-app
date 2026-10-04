"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Pencil, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/welcome";
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
        <MenuItem icon={LogOut} onClick={signOut} danger>
          Sign out
        </MenuItem>
      </OverflowMenu>
    </div>
  );
}
