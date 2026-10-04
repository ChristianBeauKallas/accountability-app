"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Users, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { poolLabel } from "@/lib/format";
import type { Need } from "@/lib/types";

export type NeedWithCount = Need & { applicant_count: number };

export function NeedsView({ needs: initial }: { needs: NeedWithCount[] }) {
  const supabase = createClient();
  const [needs, setNeeds] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleStatus(need: NeedWithCount) {
    const next = need.status === "open" ? "closed" : "open";
    setBusyId(need.id);
    setNeeds((cur) =>
      cur.map((n) => (n.id === need.id ? { ...n, status: next } : n))
    );
    await supabase.from("needs").update({ status: next }).eq("id", need.id);
    setBusyId(null);
  }

  async function remove(need: NeedWithCount) {
    if (
      !confirm(
        `Delete "${need.title}"? This removes the need and everyone who's in for it.`
      )
    )
      return;
    setBusyId(need.id);
    const { error } = await supabase.from("needs").delete().eq("id", need.id);
    setBusyId(null);
    if (!error) setNeeds((cur) => cur.filter((n) => n.id !== need.id));
  }

  return (
    <div className="space-y-4">
      <Link href="/needs/new" className="block">
        <Button size="lg" full>
          <Plus size={18} strokeWidth={2.5} aria-hidden />
          Post a need
        </Button>
      </Link>

      {needs.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold text-ink">
            No needs posted yet
          </p>
          <p className="mt-1 text-sm text-body-2">
            Post your first need to start hearing from players who fit.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {needs.map((need) => (
            <li key={need.id}>
              <Card className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold leading-tight">
                      {need.title}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {poolLabel(
                        need.grad_year_min,
                        need.grad_year_max,
                        need.accepts_transfer
                      )}
                    </p>
                  </div>
                  <Chip
                    tone={need.status === "open" ? "status-new" : "status-closed"}
                    size="sm"
                  >
                    {need.status === "open" ? "Open" : "Closed"}
                  </Chip>
                </div>

                <div className="flex flex-wrap gap-2">
                  {need.positions.map((p) => (
                    <Chip key={p} tone="accent" size="sm">
                      {p}
                    </Chip>
                  ))}
                  {need.min_gpa > 0 && (
                    <Chip tone="metric" size="sm">
                      GPA {need.min_gpa}+
                    </Chip>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-divider pt-3">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                    <Users size={16} strokeWidth={2} className="text-muted" aria-hidden />
                    {need.applicant_count} in
                  </span>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleStatus(need)}
                      disabled={busyId === need.id}
                      className="text-sm font-semibold text-accent disabled:opacity-50"
                    >
                      {need.status === "open" ? "Close" : "Reopen"}
                    </button>
                    <Link
                      href={`/needs/${need.id}/edit`}
                      className="text-muted"
                      aria-label="Edit need"
                    >
                      <Pencil size={17} strokeWidth={2} />
                    </Link>
                    <button
                      onClick={() => remove(need)}
                      disabled={busyId === need.id}
                      className="text-danger disabled:opacity-50"
                      aria-label="Delete need"
                    >
                      <Trash2 size={17} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
