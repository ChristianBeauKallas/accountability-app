"use client";

import { NotificationsBell } from "@/components/NotificationsBell";
import { ThemeToggle } from "@/components/ThemeToggle";

// The top-right action cluster that sits inline in each screen's header
// (scrolls with content). Bell is player-only; `children` is an optional
// overflow menu (e.g. on Profile/Program).
export function HeaderActions({
  showBell = false,
  children,
}: {
  showBell?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="-mr-1.5 flex items-center gap-0.5">
      {showBell && <NotificationsBell />}
      <ThemeToggle />
      {children}
    </div>
  );
}
