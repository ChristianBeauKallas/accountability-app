"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ListChecks,
  User,
  Inbox,
  ClipboardList,
  Building2,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { BaseballIcon } from "@/components/ui/BaseballIcon";

type Role = "player" | "coach";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const FitsIcon = BaseballIcon as unknown as LucideIcon;

const TABS: Record<Role, Tab[]> = {
  player: [
    { href: "/fits", label: "Fits", icon: FitsIcon },
    { href: "/tracker", label: "My Spots", icon: ListChecks },
    { href: "/following", label: "Following", icon: Bookmark },
    { href: "/profile", label: "Profile", icon: User },
  ],
  coach: [
    { href: "/inbox", label: "Inbox", icon: Inbox },
    { href: "/needs", label: "Needs", icon: ClipboardList },
    { href: "/following", label: "Following", icon: Bookmark },
    { href: "/program", label: "Program", icon: Building2 },
  ],
};

export function TabBar({ role }: { role: Role }) {
  const pathname = usePathname();
  const tabs = TABS[role];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 mx-auto w-full max-w-app border-t border-border bg-surface shadow-nav"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4 h-[84px]">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                data-tour={`tab-${tab.href.slice(1)}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 pt-1",
                  active ? "text-accent" : "text-muted-2"
                )}
              >
                <Icon size={22} strokeWidth={2} aria-hidden />
                <span className="font-sans text-[11px] font-semibold">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
