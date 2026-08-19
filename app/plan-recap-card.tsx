import Link from "next/link";
import { Avatar } from "./avatar";
import PostGallery from "./post-gallery";
import PostComments from "./post-comments";
import ReactionBar from "./reaction-bar";
import PostDate from "./post-date";

export type PlanItems = {
  workouts?: { title: string; effort: string | null }[];
  meals?: {
    count: number;
    calories: number;
    protein: number;
    target_calories: number | null;
    target_protein: number | null;
  } | null;
  habits?: { label: string; emoji: string; count: number }[];
};

export type PlanRecapData = {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string;
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
  photos,
  planItems,
  reactions,
  comments,
  viewerId,
}: PlanRecapData) {
  const workouts = planItems?.workouts ?? [];
  const meals = planItems?.meals ?? null;
  const habits = planItems?.habits ?? [];
  const firstName = authorName.split(" ")[0];

  // A specific summary of what they actually did.
  const phrases: string[] = [];
  if (workouts.length > 0) phrases.push("completed a workout");
  if (meals) phrases.push(`logged ${meals.count} meal${meals.count === 1 ? "" : "s"}`);
  if (habits.length > 0) phrases.push(habits.map((h) => h.label).join(", "));
  const joined =
    phrases.length <= 1
      ? phrases[0] ?? "worked their plan"
      : phrases.length === 2
        ? `${phrases[0]} and ${phrases[1]}`
        : `${phrases.slice(0, -1).join(", ")}, and ${phrases[phrases.length - 1]}`;
  const lead = `${firstName} ${joined} toward their plan today`;

  return (
    <article className="post plan-recap">
      <div className="post-head">
        <Link className="post-author-link" href={`/u/${authorId}`}>
          <Avatar name={authorName} url={authorAvatar} />
          <span className="post-author">{authorName}</span>
        </Link>
        <div className="post-head-right">
          <span className="pr-tag">📋 Plan</span>
          <PostDate iso={createdAt} />
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
