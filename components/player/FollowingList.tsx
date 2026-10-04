"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, BadgeCheck, Bookmark } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { SaveButton } from "@/components/SaveButton";
import type { Program } from "@/lib/types";

export function FollowingList({
  programs,
  userId,
}: {
  programs: Program[];
  userId: string;
}) {
  const [list, setList] = useState(programs);

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-accent-soft text-accent">
          <Bookmark size={22} strokeWidth={2} aria-hidden />
        </span>
        <p className="font-display text-lg font-semibold text-ink">
          No saved schools yet
        </p>
        <p className="max-w-xs text-sm text-body-2">
          Tap the ☆ on any school or fit to keep it here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {list.map((program) => (
        <li key={program.id}>
          <Card padded>
            <div className="flex items-center gap-3">
              <Link
                href={`/programs/${program.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar name={program.name} src={program.logo_url} size={42} />
                <div className="min-w-0">
                  <h3 className="flex items-center gap-1 truncate font-display text-base font-semibold leading-tight">
                    <span className="truncate">{program.name}</span>
                    {program.verified && (
                      <BadgeCheck
                        size={15}
                        strokeWidth={2}
                        className="shrink-0 text-accent"
                        aria-label="Verified"
                      />
                    )}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                    <MapPin size={13} strokeWidth={2} aria-hidden />
                    <span className="truncate">
                      {[program.city, program.state].filter(Boolean).join(", ")}
                      {program.division ? ` · ${program.division}` : ""}
                    </span>
                  </p>
                </div>
              </Link>
              <SaveButton
                programId={program.id}
                playerId={userId}
                initial
                onToggle={(saved) => {
                  if (!saved)
                    setList((l) => l.filter((p) => p.id !== program.id));
                }}
              />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
