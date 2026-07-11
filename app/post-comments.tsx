"use client";

import { useState } from "react";
import CommentBox from "./comment-box";

type C = { id: string; body: string; authorName: string };

export default function PostComments({
  comments,
  postId,
  userId,
}: {
  comments: C[];
  postId: string;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const count = comments.length;

  return (
    <div className="post-comments">
      {count > 0 && !open && (
        <button className="comments-toggle" onClick={() => setOpen(true)}>
          View {count} comment{count > 1 ? "s" : ""}
        </button>
      )}

      {open && count > 0 && (
        <ul className="comments">
          {comments.map((c) => (
            <li className="comment" key={c.id}>
              <span className="comment-author">{c.authorName}</span> {c.body}
            </li>
          ))}
        </ul>
      )}

      <CommentBox postId={postId} userId={userId} onSent={() => setOpen(true)} />
    </div>
  );
}
