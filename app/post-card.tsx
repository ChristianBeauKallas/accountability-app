import Link from "next/link";
import { Avatar } from "./avatar";
import PostGallery from "./post-gallery";
import VoiceNote from "./voice-note";
import ActivityRow from "./activity-row";
import PostComments from "./post-comments";
import ReactionBar from "./reaction-bar";
import { timeAgo } from "@/lib/format";

export type PostCardData = {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string;
  photos: string[];
  audios: { id: string; src: string; transcript: string | null }[];
  caption: string | null;
  activityItems: { emoji: string; name: string }[];
  activityTotal: number;
  reactions: Record<string, { count: number; mine: boolean }>;
  comments: { id: string; body: string; authorName: string }[];
  viewerId: string;
};

export default function PostCard({
  postId,
  authorId,
  authorName,
  authorAvatar,
  createdAt,
  photos,
  audios,
  caption,
  activityItems,
  activityTotal,
  reactions,
  comments,
  viewerId,
}: PostCardData) {
  return (
    <article className="post">
      <div className="post-head">
        <Link className="post-author-link" href={`/u/${authorId}`}>
          <Avatar name={authorName} url={authorAvatar} />
          <span className="post-author">{authorName}</span>
        </Link>
        <span className="post-time">{timeAgo(createdAt)}</span>
      </div>

      {photos.length > 0 && <PostGallery photos={photos} />}

      {audios.map((a) => (
        <VoiceNote key={a.id} src={a.src} transcript={a.transcript} />
      ))}

      {caption && <p className="post-caption">{caption}</p>}

      <ActivityRow items={activityItems} total={activityTotal} />

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
