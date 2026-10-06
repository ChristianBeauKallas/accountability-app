"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  Moon,
  Pencil,
  LogOut,
  Bell,
  BellOff,
  BellRing,
  Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NotificationsBell } from "@/components/NotificationsBell";
import { OverflowMenu, MenuItem } from "@/components/OverflowMenu";
import { InstallModal } from "@/components/InstallGuide";
import { isStandalone } from "@/lib/pwa";
import {
  pushSupported,
  isSubscribed,
  permission,
  enablePush,
  disablePush,
} from "@/lib/push/client";

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
  const [showInstall, setShowInstall] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [pushState, setPushState] = useState<
    "unsupported" | "off" | "on" | "blocked" | "busy"
  >("unsupported");

  useEffect(() => {
    setCanInstall(!isStandalone());
  }, []);

  useEffect(() => {
    const current =
      (document.documentElement.getAttribute("data-theme") as
        | "light"
        | "dark"
        | null) ?? "dark";
    setTheme(current);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!pushSupported()) return;
      if (permission() === "denied") {
        if (active) setPushState("blocked");
        return;
      }
      const sub = await isSubscribed();
      if (active) setPushState(sub ? "on" : "off");
    })();
    return () => {
      active = false;
    };
  }, []);

  async function togglePush() {
    if (pushState === "busy" || pushState === "blocked") return;
    if (pushState === "on") {
      setPushState("busy");
      await disablePush();
      setPushState("off");
    } else {
      setPushState("busy");
      const ok = await enablePush();
      setPushState(ok ? "on" : permission() === "denied" ? "blocked" : "off");
    }
  }

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
        {pushState !== "unsupported" && (
          <MenuItem
            icon={
              pushState === "on"
                ? BellRing
                : pushState === "blocked"
                  ? BellOff
                  : Bell
            }
            onClick={togglePush}
            disabled={pushState === "blocked" || pushState === "busy"}
          >
            {pushState === "on"
              ? "Turn off notifications"
              : pushState === "blocked"
                ? "Notifications blocked"
                : pushState === "busy"
                  ? "Working…"
                  : "Turn on notifications"}
          </MenuItem>
        )}
        {onEdit && (
          <MenuItem icon={Pencil} onClick={onEdit}>
            {editLabel}
          </MenuItem>
        )}
        {canInstall && (
          <MenuItem icon={Download} onClick={() => setShowInstall(true)}>
            Add to home screen
          </MenuItem>
        )}
        <MenuItem icon={LogOut} onClick={signOut} danger>
          Sign out
        </MenuItem>
      </OverflowMenu>
      {showInstall && <InstallModal onClose={() => setShowInstall(false)} />}
    </div>
  );
}
