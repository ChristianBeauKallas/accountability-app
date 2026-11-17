"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

export function TabBar() {
  const path = usePathname();
  const active = (p: string) => path === p;
  return (
    <nav className="flex shrink-0 items-center justify-around border-t border-border bg-surface px-1.5 pt-1.5 pb-safe">
      <Link
        href="/feed"
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold",
          active("/feed") ? "text-accent" : "text-muted",
        )}
      >
        <HomeIcon />
        Feed
      </Link>
      <Link href="/log" aria-label="Log a workout" className="flex-none">
        <span className="-mt-3 grid h-[46px] w-[46px] place-items-center rounded-[15px] bg-accent text-surface shadow-[0_6px_16px_rgb(var(--c-accent)/0.4)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </Link>
      <Link
        href="/me"
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold",
          active("/me") ? "text-accent" : "text-muted",
        )}
      >
        <UserIcon />
        Profile
      </Link>
    </nav>
  );
}
