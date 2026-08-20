"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Compact ⋯ menu on a plan recap (own posts only): Share to story, or Delete.
// Share is two-step by design — the first tap builds the 9:16 graphic and shows
// a preview; navigator.share() fires from a fresh tap on the preview (iOS only
// allows share() inside a live user gesture).
export default function RecapMenu({ postId }: { postId: string }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);

  useEffect(() => setMounted(true), []);

  async function buildStory() {
    setOpen(false);
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/story/${postId}`, { cache: "no-store" });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const file = new File([blob], "npsf-story.png", { type: "image/png" });
      setPreview({ file, url: URL.createObjectURL(blob) });
    } catch (e) {
      const detail = (e as Error)?.message ?? "";
      setErr(
        detail
          ? `Couldn't create the story image. (${detail.slice(0, 140)})`
          : "Couldn't create the story image — try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function closePreview() {
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p.url);
      return null;
    });
  }

  function download() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.url;
    a.download = "npsf-story.png";
    a.click();
    closePreview();
  }

  async function doShare() {
    if (!preview) return;
    const nav = navigator as Navigator & {
      canShare?: (d: { files: File[] }) => boolean;
    };
    if (!nav.canShare || !nav.canShare({ files: [preview.file] })) {
      download();
      return;
    }
    try {
      await navigator.share({ files: [preview.file] });
      closePreview();
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") download();
    }
  }

  async function doDelete() {
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.from("group_posts").delete().eq("id", postId);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setConfirmDelete(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="post-menu-btn"
        aria-label="Post options"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
      >
        ⋯
      </button>

      {open && (
        <>
          <div className="post-menu-catch" onClick={() => setOpen(false)} />
          <div className="post-menu">
            <button type="button" onClick={buildStory}>
              📸 Share to story
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => {
                setConfirmDelete(true);
                setOpen(false);
              }}
            >
              🗑️ Delete post
            </button>
          </div>
        </>
      )}

      {mounted &&
        (err || preview) &&
        createPortal(
          <div className="tour-overlay" role="dialog" aria-modal="true">
            <div className="tour-card pm-card">
              {preview ? (
                <>
                  <h2 className="tour-title">Ready to share</h2>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="story-preview-img" src={preview.url} alt="Your story graphic" />
                  <button type="button" className="tour-action" onClick={doShare}>
                    Share to Instagram…
                  </button>
                  <div className="story-preview-row">
                    <button type="button" className="tour-back" onClick={closePreview}>
                      Cancel
                    </button>
                    <button type="button" className="tour-back" onClick={download}>
                      Save image
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="tour-icon">😕</div>
                  <h2 className="tour-title">Hmm, that didn&apos;t work</h2>
                  <p className="tour-body">{err}</p>
                  <div className="tour-nav">
                    <span />
                    <button type="button" className="tour-next" onClick={() => setErr(null)}>
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
        confirmDelete &&
        createPortal(
          <div className="tour-overlay" role="dialog" aria-modal="true">
            <div className="tour-card pm-card">
              <div className="tour-icon">🗑️</div>
              <h2 className="tour-title">Delete this post?</h2>
              <p className="tour-body">
                This removes it from the group feed. Your logged workout, meals,
                and habits stay in My Plan.
              </p>
              {err && <p className="auth-error">{err}</p>}
              <div className="tour-nav">
                <button
                  type="button"
                  className="tour-back"
                  onClick={() => setConfirmDelete(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="button" className="pm-delete" onClick={doDelete} disabled={busy}>
                  {busy ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
