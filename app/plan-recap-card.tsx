import Link from "next/link";
import { Avatar } from "./avatar";
import PostGallery from "./post-gallery";
import PostComments from "./post-comments";
import ReactionBar from "./reaction-bar";
import PostDate from "./post-date";
import RecapMenu from "./recap-menu";

export type PlanItems = {
  workouts?: { title: string; effort: string | null }[];
  meals?: {
    count: number;
    calories: number;
    protein: number;
    target_calories: number | null;
    target_protein: number | null;
  } | null;
  water?: { oz: number; unit: string } | null;
  habits?: { label: string; emoji: string; count: number }[];
};

// Turn a tracker label into a natural first-person verb phrase.
function habitPhrase(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("jiu") || l.includes("jitsu") || l.includes("bjj")) return "trained jiu-jitsu";
  if (l.includes("step")) return "hit my steps";
  if (l.includes("podcast")) return "listened to a podcast";
  if (l.includes("mobility") || l.includes("stretch")) return "did my mobility";
  if (l.includes("read") || l.includes("book") || l.includes("bible")) return "read";
  return `did ${label.toLowerCase()}`;
}

function naturalJoin(arr: string[]): string {
  if (arr.length === 0) return "worked my plan";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
}

export type PlanRecapData = {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string;
  updatedAt?: string | null;
  photos: string[];
  planItems: PlanItems | null;
  reactions: Record<string, { count: number; mine: boolean }>;
  comments: { id: string; body: string; authorName: string }[];
  viewerId: string;
};

export default function PlanRecapCard({
  postId,
  authorId,
  authorName,
  authorAvatar,
  createdAt,
  updatedAt,
  photos,
  planItems,
  reactions,
  comments,
  viewerId,
}: PlanRecapData) {
  const workouts = planItems?.workouts ?? [];
  const meals = planItems?.meals ?? null;
  const water = planItems?.water ?? null;
  const habits = planItems?.habits ?? [];

  // First-person summary — reads like the person wrote it, not the system.
  const phrases: string[] = [];
  if (workouts.length > 0) {
    const isRun = /run|tempo|long|mile|jog|interval/i.test(workouts[0].title);
    phrases.push(isRun ? "got my run in" : "got my workout in");
  }
  if (meals) phrases.push(`logged ${meals.count} meal${meals.count === 1 ? "" : "s"}`);
  if (water) phrases.push(`drank ${water.oz} ${water.unit} of water`);
  for (const h of habits) phrases.push(habitPhrase(h.label));
  const sentence = naturalJoin(phrases);
  const lead = `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} today`;

  const edited =
    !!updatedAt &&
    new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 60_000;

  return (
    <article className="post plan-recap">
      <div className="post-head">
        <Link className="post-author-link" href={`/u/${authorId}`}>
          <Avatar name={authorName} url={authorAvatar} />
          <span className="post-author">{authorName}</span>
        </Link>
        <div className="post-head-right">
          {edited && <span className="pr-updated">updated</span>}
          <PostDate iso={edited ? (updatedAt as string) : createdAt} />
          {viewerId === authorId && <RecapMenu postId={postId} />}
        </div>
      </div>

      <p className="pr-lead">{lead}</p>

      {photos.length > 0 && <PostGallery photos={photos} />}

      <ul className="pr-list">
        {workouts.map((w, i) => (
          <li key={`w${i}`}>
            <span className="pr-ic">🏋️</span>
            <span className="pr-txt">{w.title}</span>
            {w.effort && <span className="pr-badge">felt {w.effort}</span>}
          </li>
        ))}
        {meals && (
          <li>
            <span className="pr-ic">🍽️</span>
            <span className="pr-txt">
              {meals.count} meal{meals.count === 1 ? "" : "s"} logged
            </span>
            {meals.calories > 0 && (
              <span className="pr-badge">
                {meals.calories}
                {meals.target_calories ? ` / ${meals.target_calories}` : ""} cal
                {meals.protein > 0 ? ` · ${meals.protein}g P` : ""}
              </span>
            )}
          </li>
        )}
        {water && (
          <li>
            <span className="pr-ic">💧</span>
            <span className="pr-txt">Water</span>
            <span className="pr-badge">
              {water.oz} {water.unit}
            </span>
          </li>
        )}
        {habits.map((h, i) => (
          <li key={`h${i}`}>
            <span className="pr-ic">{h.emoji}</span>
            <span className="pr-txt">{h.label}</span>
            {h.count > 1 && <span className="pr-badge">×{h.count}</span>}
          </li>
        ))}
      </ul>

      <PostComments
        postId={postId}
        userId={viewerId}
        comments={comments}
        reactions={
          <ReactionBar postId={postId} userId={viewerId} initial={reactions} />
        }
      />
    </article>
  );
}
