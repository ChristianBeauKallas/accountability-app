import { Avatar } from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/wellness";
import type { ReactionState } from "@/lib/reactions";
import { PostReactions } from "./PostReactions";
import { PhotoCarousel } from "./PhotoCarousel";

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function PostCard({
  id,
  photoUrls,
  place,
  description,
  durationMinutes,
  createdAt,
  name,
  avatarUrl,
  mine,
  daysLabel,
  viewerId,
  reactions,
  now,
}: {
  id: string;
  photoUrls: string[];
  place: string | null;
  description: string | null;
  durationMinutes: number;
  createdAt: string;
  name: string;
  avatarUrl: string | null;
  mine: boolean;
  daysLabel?: string;
  viewerId: string;
  reactions: ReactionState;
  now: Date;
}) {
  return (
    <article className={`overflow-hidden rounded-card border bg-surface shadow-card ${mine ? "border-accent ring-1 ring-accent" : "border-border"}`}>
      <div className="flex items-center gap-2.5 p-[11px]">
        <Avatar name={name} src={avatarUrl} size={34} />
        <div className="min-w-0">
          <div className="truncate text-[0.86rem] font-bold text-ink">{name}</div>
          <div className="text-[0.72rem] text-muted">{timeAgo(createdAt, now)}</div>
        </div>
        {mine && (
          <span className="ml-auto rounded-pill bg-accent-soft px-2 py-[3px] text-[0.64rem] font-bold tracking-wide text-accent">
            YOU
          </span>
        )}
      </div>
      <div className="relative aspect-square w-full bg-chip">
        {photoUrls.length > 1 ? (
          <PhotoCarousel urls={photoUrls} />
        ) : photoUrls.length === 1 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrls[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-accent-soft to-chip" />
        )}
        <span className="absolute right-2.5 top-2.5 rounded-pill bg-black/70 px-2 py-[5px] font-display text-[0.72rem] font-bold text-white">
          {durationMinutes}m
        </span>
        {place && (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-pill bg-black/70 px-2.5 py-[5px] text-[0.72rem] font-semibold text-white">
            <PinIcon />
            {place}
          </span>
        )}
        {daysLabel && (
          <span className="absolute bottom-2.5 right-2.5 rounded-pill bg-black/70 px-2.5 py-[5px] font-display text-[0.72rem] font-bold text-white">
            {daysLabel}
          </span>
        )}
      </div>
      {description && (
        <div className="px-[13px] pb-1 pt-2.5 text-[0.86rem] leading-snug text-body-2">
          <b className="text-ink">{name.split(" ")[0]}</b> {description}
        </div>
      )}
      <PostReactions checkinId={id} memberId={viewerId} initial={reactions} />
    </article>
  );
}
