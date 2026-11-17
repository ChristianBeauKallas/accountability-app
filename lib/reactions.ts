// Pure, shared types/helpers for post reactions (no client/server imports, so
// both the server pages and the client PostReactions component can use them).

export type EKey = "fire" | "thumb" | "heart";
export type ReactionState = Record<EKey, { count: number; me: boolean }>;
export const EMOJI: Record<EKey, string> = { fire: "🔥", thumb: "👍", heart: "❤️" };

export function emptyReactions(): ReactionState {
  return {
    fire: { count: 0, me: false },
    thumb: { count: 0, me: false },
    heart: { count: 0, me: false },
  };
}

export type ReactionRow = { checkin_id: string; emoji: EKey; member_id: string };

// Aggregates raw reaction rows into per-post counts + whether the viewer reacted.
export function buildReactionMap(
  postIds: string[],
  rows: ReactionRow[],
  viewerId: string,
): Map<string, ReactionState> {
  const map = new Map<string, ReactionState>();
  postIds.forEach((id) => map.set(id, emptyReactions()));
  for (const r of rows) {
    const e = map.get(r.checkin_id);
    if (!e || !e[r.emoji]) continue;
    e[r.emoji].count++;
    if (r.member_id === viewerId) e[r.emoji].me = true;
  }
  return map;
}
