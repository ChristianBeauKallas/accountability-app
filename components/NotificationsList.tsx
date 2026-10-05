"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Megaphone, Star, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { timeAgo } from "@/lib/format";
import type { Notification } from "@/lib/types";

export function NotificationsList({
  userId,
  initial,
}: {
  userId: string;
  initial: Notification[];
}) {
  const supabase = createClient();

  // Mark everything read once the page is open.
  useEffect(() => {
    if (initial.some((n) => !n.read_at)) {
      supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null)
        .then(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (initial.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-accent-soft text-accent">
          <Bell size={22} strokeWidth={2} aria-hidden />
        </span>
        <p className="font-display text-lg font-semibold text-ink">
          You&rsquo;re all caught up
        </p>
        <p className="max-w-xs text-sm text-body-2">
          Updates from schools you follow or applied to — plus coach interest —
          land here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {initial.map((n) => {
        const programId =
          typeof n.data?.program_id === "string" ? n.data.program_id : null;
        const href = programId ? `/programs/${programId}` : "/tracker";
        const Icon = n.type === "coach_interested" ? Star : Megaphone;
        return (
          <li key={n.id}>
            <Link href={href} className="block">
              <Card padded interactive className={!n.read_at ? "ring-1 ring-accent/30" : undefined}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-accent">
                    <Icon size={18} strokeWidth={2} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 text-sm text-body-2 line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-2">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.read_at && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-pill bg-accent" />
                  )}
                </div>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
