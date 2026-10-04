import type { ApplicationStatus, Player } from "@/lib/types";

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, (Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function formatHeight(inches: number | null): string | null {
  if (inches == null) return null;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export function formatMiles(miles: number | null): string | null {
  if (miles == null) return null;
  if (miles < 10) return `${miles.toFixed(0)} mi`;
  return `${Math.round(miles / 5) * 5} mi`;
}

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  new: "New",
  viewed: "Viewed",
  interested: "Interested",
  closed: "Passed",
};

export const STATUS_TONE: Record<ApplicationStatus, string> = {
  new: "status-new",
  viewed: "status-viewed",
  interested: "status-interested",
  closed: "status-closed",
};

// Human-readable metric chips for a player, position-aware.
export function metricChips(player: Player): string[] {
  const chips: string[] = [];
  if (player.sixty_yd != null) chips.push(`${player.sixty_yd} 60`);
  if (player.exit_velo != null) chips.push(`${player.exit_velo} EV`);
  if (player.fastball_velo != null) chips.push(`${player.fastball_velo} FB`);
  if (player.inf_velo != null) chips.push(`${player.inf_velo} INF`);
  if (player.of_velo != null) chips.push(`${player.of_velo} OF`);
  if (player.pop_time != null) chips.push(`${player.pop_time} POP`);
  return chips;
}

export function poolLabel(
  gradMin: number | null,
  gradMax: number | null,
  acceptsTransfer: boolean
): string {
  const parts: string[] = [];
  if (gradMin != null && gradMax != null) {
    parts.push(gradMin === gradMax ? `${gradMin}` : `${gradMin}–${gradMax}`);
  }
  if (acceptsTransfer) parts.push("Transfer");
  return parts.join(" · ") || "Any class";
}
