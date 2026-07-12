"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Owner-only controls on a post: edit the caption or delete the whole post.
// Deleting cascades its activities, comments, reactions, and media via FK.
export default function PostMenu({
  postId,
  caption,
}: {
  postId: string;
  caption: string | null;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<null | "edit" | "delete">(null);
  const [text, setText] = useState(caption ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  async function saveEdit() {
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("group_posts")
      .update({ caption: text.trim() || null })
      .eq("id", postId);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMode(null);
    router.refresh();
  }

  async function doDelete() {
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("group_posts")
      .delete()
      .eq("id", postId);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMode(null);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="post-menu-btn"
        aria-label="Post options"
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
      </button>

      {open && (
        <>
          <div className="post-menu-catch" onClick={() => setOpen(false)} />
          <div className="post-menu">
            <button
              type="button"
              onClick={() => {
                setText(caption ?? "");
                setMode("edit");
                setOpen(false);
              }}
            >
              ✏️ Edit caption
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => {
                setMode("delete");
                setOpen(false);
              }}
            >
              🗑️ Delete post
            </button>
          </div>
        </>
      )}

      {mounted &&
        mode &&
        createPortal(
          <div className="tour-overlay" role="dialog" aria-modal="true">
            <div className="tour-card pm-card">
              {mode === "edit" ? (
                <>
                  <h2 className="tour-title">Edit caption</h2>
                  <textarea
                    className="pm-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    placeholder="What did you do?"
                    autoFocus
                  />
                  {err && <p className="auth-error">{err}</p>}
                  <div className="tour-nav">
                    <button
                      type="button"
                      className="tour-back"
                      onClick={() => setMode(null)}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="tour-next"
                      onClick={saveEdit}
                      disabled={busy}
                    >
                      {busy ? "Saving…" : "Save"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="tour-icon">🗑️</div>
                  <h2 className="tour-title">Delete this post?</h2>
                  <p className="tour-body">
                    This removes the update and everything on it — photos, voice
                    notes, reactions, and comments. It can&apos;t be undone.
                  </p>
                  {err && <p className="auth-error">{err}</p>}
                  <div className="tour-nav">
                    <button
                      type="button"
                      className="tour-back"
                      onClick={() => setMode(null)}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="pm-delete"
                      onClick={doDelete}
                      disabled={busy}
                    >
                      {busy ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
