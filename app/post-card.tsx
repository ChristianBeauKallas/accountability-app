import Link from "next/link";
import { Avatar } from "./avatar";
import PostGallery from "./post-gallery";
import VoiceNote from "./voice-note";
import ActivityRow from "./activity-row";
import PostComments from "./post-comments";
import ReactionBar from "./reaction-bar";
import PostMenu from "./post-menu";
import PostDate from "./post-date";

export type PostCardData = {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string;
  photos: string[];
  audios: {
    id: string;
    src: string;
    transcript: string | null;
    duration: number | null;
  }[];
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
          <span className="post-id">
            <span className="post-author">{authorName}</span>
            <PostDate iso={createdAt} />
          </span>
        </Link>
        {viewerId === authorId && (
          <div className="post-head-right">
            <PostMenu postId={postId} caption={caption} />
          </div>
        )}
      </div>

      {photos.length > 0 && <PostGallery photos={photos} />}

      {caption && <p className="post-caption">{caption}</p>}

      {(activityItems.length > 0 || audios.length > 0) && (
        <div className="post-meta">
          <ActivityRow items={activityItems} total={activityTotal} />
          {audios.map((a) => (
            // The caption already shows the readable text, so only offer the
            // transcript toggle for older voice notes that have no caption.
            <VoiceNote
              key={a.id}
              src={a.src}
              transcript={caption ? null : a.transcript}
              duration={a.duration}
            />
          ))}
        </div>
      )}

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
