"use client";

import { useState } from "react";
import { MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ProgressBar, StepProgress } from "@/components/ui/ProgressBar";
import { Avatar } from "@/components/ui/Avatar";

const SWATCHES: { name: string; className: string; ring?: boolean }[] = [
  { name: "ink", className: "bg-ink" },
  { name: "accent", className: "bg-accent" },
  { name: "accent-dark", className: "bg-accent-dark" },
  { name: "accent-soft", className: "bg-accent-soft", ring: true },
  { name: "gold", className: "bg-gold" },
  { name: "ground", className: "bg-ground", ring: true },
  { name: "surface", className: "bg-surface", ring: true },
  { name: "warm-soft", className: "bg-warm-soft", ring: true },
];

export default function PreviewPage() {
  const [seg, setSeg] = useState<"fits" | "applied">("fits");

  return (
    <main className="px-5 py-8 pb-16 space-y-10">
      <header className="space-y-1">
        <p className="eyebrow">Design system</p>
        <h1 className="text-4xl font-display font-bold tracking-tight">
          Athletx
        </h1>
        <p className="text-muted">Tokens &amp; shared components preview.</p>
      </header>

      {/* Type scale */}
      <section className="space-y-3">
        <p className="eyebrow">Type</p>
        <h2 className="text-5xl font-display font-bold tabular-nums">92</h2>
        <h3 className="text-2xl font-display font-semibold">Catcher wanted</h3>
        <p className="text-base">
          Body copy in Manrope. Clear, legible, and calm.
        </p>
        <p className="text-sm text-muted">Secondary / supporting text.</p>
      </section>

      {/* Colors */}
      <section className="space-y-3">
        <p className="eyebrow">Color</p>
        <div className="grid grid-cols-4 gap-3">
          {SWATCHES.map((s) => (
            <div key={s.name} className="space-y-1">
              <div
                className={`h-12 rounded-btn ${s.className} ${
                  s.ring ? "ring-1 ring-inset ring-border" : ""
                }`}
              />
              <p className="text-[11px] text-muted-2">{s.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-3">
        <p className="eyebrow">Buttons</p>
        <Button size="lg" full>
          I&rsquo;m Interested
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Withdraw</Button>
        </div>
      </section>

      {/* Chips */}
      <section className="space-y-3">
        <p className="eyebrow">Chips</p>
        <div className="flex flex-wrap gap-2">
          <Chip tone="accent">C / 1B</Chip>
          <Chip tone="metric">6.8 60yd</Chip>
          <Chip tone="selected">D2</Chip>
          <Chip>2026</Chip>
          <Chip tone="status-new">New</Chip>
          <Chip tone="status-viewed">Viewed</Chip>
          <Chip tone="status-interested">Interested</Chip>
          <Chip tone="status-closed">Closed</Chip>
        </div>
      </section>

      {/* Segmented control */}
      <section className="space-y-3">
        <p className="eyebrow">Segmented control</p>
        <SegmentedControl
          value={seg}
          onChange={setSeg}
          segments={[
            { value: "fits", label: "Your fits" },
            { value: "applied", label: "In the mix" },
          ]}
        />
      </section>

      {/* Progress */}
      <section className="space-y-4">
        <p className="eyebrow">Progress</p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Profile completeness</span>
            <span className="font-semibold tabular-nums">72%</span>
          </div>
          <ProgressBar value={72} />
        </div>
        <StepProgress total={4} current={2} />
      </section>

      {/* Avatars + card */}
      <section className="space-y-3">
        <p className="eyebrow">Fit card</p>
        <Card interactive className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar name="Cowley College" />
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-display font-semibold leading-tight">
                Cowley College
              </h3>
              <p className="flex items-center gap-1 text-sm text-muted">
                <MapPin size={14} strokeWidth={2} aria-hidden />
                Arkansas City, KS · JUCO
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-accent">
                <Star size={16} strokeWidth={2} aria-hidden />
                <span className="font-display text-2xl font-bold tabular-nums">
                  88
                </span>
              </div>
              <p className="text-[11px] text-muted-2">fit score</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip tone="accent">C</Chip>
            <Chip>2026</Chip>
            <Chip tone="metric">Needs GPA 2.5+</Chip>
          </div>
          <Button full>I&rsquo;m Interested</Button>
        </Card>
      </section>
    </main>
  );
}
