"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Activity } from "@/lib/types";

// Owner-only controls on a post: edit it (caption + which activities it counts)
// or delete the whole post. Deleting cascades its activities, comments,
// reactions, and media via FK.
export default function PostMenu({
  postId,
  groupId,
  caption,
}: {
  postId: string;
  groupId: string;
  caption: string | null;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<null | "edit" | "delete">(null);
  const [text, setText] = useState(caption ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Post editor: the group's activities + which ones this post counts.
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [origSelected, setOrigSelected] = useState<Set<string>>(new Set());
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null,
  );

  useEffect(() => setMounted(true), []);

  // Step 1: build the 9:16 Story graphic server-side and show a preview. We do
  // NOT call navigator.share() here — iOS only allows share() inside a fresh
  // user gesture, and the await above would consume it. The preview's Share
  // button (a new tap) does the actual share.
  async function shareStory() {
    setOpen(false);
    setShareErr(null);
    setSharing(true);
    try {
      const res = await fetch(`/api/story/${postId}`, { cache: "no-store" });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const file = new File([blob], "getbetter-story.png", {
        type: "image/png",
      });
      setPreview({ file, url: URL.createObjectURL(blob) });
    } catch (e) {
      const detail = (e as Error)?.message ?? "";
      setShareErr(
        detail
          ? `Couldn't create the story image. (${detail.slice(0, 140)})`
          : "Couldn't create the story image — try again.",
      );
    } finally {
      setSharing(false);
    }
  }

  function closePreview() {
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p.url);
      return null;
    });
  }

  function downloadPreview() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.url;
    a.download = "getbetter-story.png";
    a.click();
    closePreview();
  }

  // Step 2: fired straight from the Share button tap (gesture intact).
  async function doShare() {
    if (!preview) return;
    const nav = navigator as Navigator & {
      canShare?: (d: { files: File[] }) => boolean;
    };
    if (!nav.canShare || !nav.canShare({ files: [preview.file] })) {
      downloadPreview();
      return;
    }
    try {
      await navigator.share({ files: [preview.file] });
      closePreview();
    } catch (e) {
      // Cancelling the sheet throws AbortError — leave the preview open so they
      // can try again or save instead.
      if ((e as Error)?.name !== "AbortError") downloadPreview();
    }
  }

  // Open the editor: load the group's activities and this post's current ones.
  async function openEdit() {
    setText(caption ?? "");
    setErr(null);
    setMode("edit");
    setOpen(false);
    setLoadingEdit(true);
    const supabase = createClient();
    const [{ data: acts }, { data: pa }] = await Promise.all([
      supabase
        .from("activities")
        .select("*")
        .eq("group_id", groupId)
        .eq("active", true)
        .order("sort_order"),
      supabase.from("post_activities").select("activity_id").eq("post_id", postId),
    ]);
    setActivities((acts ?? []) as Activity[]);
    const sel = new Set(
      ((pa ?? []) as { activity_id: string }[]).map((r) => r.activity_id),
    );
    setSelected(sel);
    setOrigSelected(new Set(sel));
    setLoadingEdit(false);
  }

  function toggleActivity(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function saveEdit() {
    setBusy(true);
    setErr(null);
    const supabase = createClient();

    // Caption.
    const { error: capErr } = await supabase
      .from("group_posts")
      .update({ caption: text.trim() || null })
      .eq("id", postId);
    if (capErr) {
      setErr(capErr.message);
      setBusy(false);
      return;
    }

    // Activities — add the newly checked, remove the unchecked.
    const toAdd = [...selected].filter((id) => !origSelected.has(id));
    const toRemove = [...origSelected].filter((id) => !selected.has(id));
    if (toAdd.length > 0) {
      const { error } = await supabase
        .from("post_activities")
        .insert(toAdd.map((activity_id) => ({ post_id: postId, activity_id })));
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
    }
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from("post_activities")
        .delete()
        .eq("post_id", postId)
        .in("activity_id", toRemove);
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
    }

    setBusy(false);
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
            <button type="button" onClick={shareStory}>
              📸 Share to story
            </button>
            <button type="button" onClick={openEdit}>
              ✏️ Edit post
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
        (sharing || shareErr || preview) &&
        createPortal(
          <div className="tour-overlay" role="dialog" aria-modal="true">
            <div className="tour-card pm-card">
              {sharing ? (
                <>
                  <div className="tour-icon">📸</div>
                  <h2 className="tour-title">Creating your story…</h2>
                  <p className="tour-body">
                    Building your shareable graphic — one sec.
                  </p>
                </>
              ) : preview ? (
                <>
                  <h2 className="tour-title">Ready to share</h2>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="story-preview-img"
                    src={preview.url}
                    alt="Your story graphic"
                  />
                  <button
                    type="button"
                    className="tour-action"
                    onClick={doShare}
                  >
                    Share to Instagram…
                  </button>
                  <div className="story-preview-row">
                    <button
                      type="button"
                      className="tour-back"
                      onClick={closePreview}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="tour-back"
                      onClick={downloadPreview}
                    >
                      Save image
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="tour-icon">😕</div>
                  <h2 className="tour-title">Hmm, that didn&apos;t work</h2>
                  <p className="tour-body">{shareErr}</p>
                  <div className="tour-nav">
                    <span />
                    <button
                      type="button"
                      className="tour-next"
                      onClick={() => setShareErr(null)}
                    >
                      OK
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        mode &&
        createPortal(
          <div className="tour-overlay" role="dialog" aria-modal="true">
            <div className="tour-card pm-card">
              {mode === "edit" ? (
                <>
                  <h2 className="tour-title">Edit post</h2>
                  <p className="pm-section-label">What you did</p>
                  {loadingEdit ? (
                    <p className="pm-loading">Loading…</p>
                  ) : (
                    <div className="pm-acts">
                      {activities.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className={`toggle ${selected.has(a.id) ? "on" : ""}`}
                          onClick={() => toggleActivity(a.id)}
                        >
                          <span className="toggle-emoji">{a.emoji ?? "✅"}</span>
                          <span className="toggle-text">
                            <span className="toggle-name">{a.name}</span>
                          </span>
                          <span className="pm-check">
                            {selected.has(a.id) ? "✓" : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="pm-section-label">Caption</p>
                  <textarea
                    className="pm-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    placeholder="What did you do?"
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
                      disabled={busy || loadingEdit}
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
