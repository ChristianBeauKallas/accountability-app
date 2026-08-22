"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Compact ⋯ menu on a plan recap (own posts only): Share to story, or Delete.
// Share is two-step by design — the first tap builds the 9:16 graphic and shows
// a preview; navigator.share() fires from a fresh tap on the preview (iOS only
// allows share() inside a live user gesture).
export default function RecapMenu({
  postId,
  photoChoices = [],
}: {
  postId: string;
  photoChoices?: { id: string; url: string }[];
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [picking, setPicking] = useState(false);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [done, setDone] = useState<null | "shared" | "saved">(null);

  useEffect(() => setMounted(true), []);

  // Open the share flow: if there's more than one photo, let them choose the
  // backdrop first; otherwise build straight away.
  function startShare() {
    setOpen(false);
    setErr(null);
    if (photoChoices.length > 1) setPicking(true);
    else buildStory();
  }

  async function buildStory(mediaId?: string) {
    setPicking(false);
    setErr(null);
    setBusy(true);
    try {
      const qs = mediaId ? `?media=${encodeURIComponent(mediaId)}` : "";
      const res = await fetch(`/api/story/${postId}${qs}`, { cache: "no-store" });
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

  function canShareFile(): boolean {
    if (!preview) return false;
    const nav = navigator as Navigator & {
      canShare?: (d: { files: File[] }) => boolean;
    };
    return !!nav.canShare && nav.canShare({ files: [preview.file] });
  }

  // Desktop fallback only — on iOS this opens the broken file page, so we only
  // reach it when the Web Share API isn't available (e.g. a desktop browser).
  function triggerDownload() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.url;
    a.download = "npsf-story.png";
    a.click();
  }

  // "Share to Instagram…" — open the share sheet.
  async function doShare() {
    if (!preview) return;
    if (!canShareFile()) {
      triggerDownload();
      closePreview();
      setDone("saved");
      return;
    }
    try {
      await navigator.share({ files: [preview.file] });
      closePreview();
      setDone("shared");
    } catch (e) {
      // AbortError = they backed out of the sheet; leave the preview up.
      if ((e as Error)?.name !== "AbortError") {
        triggerDownload();
        closePreview();
        setDone("saved");
      }
    }
  }

  // "Save image" — the only reliable path to the Photos library on iOS is the
  // share sheet's "Save Image" action, so route through it.
  async function saveImage() {
    if (!preview) return;
    if (!canShareFile()) {
      triggerDownload();
      closePreview();
      setDone("saved");
      return;
    }
    try {
      await navigator.share({ files: [preview.file] });
      closePreview();
      setDone("saved");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        triggerDownload();
        closePreview();
        setDone("saved");
      }
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
            <button type="button" onClick={startShare}>
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
        picking &&
        createPortal(
          <div className="tour-overlay" role="dialog" aria-modal="true">
            <div className="tour-card pm-card">
              <h2 className="tour-title">Pick your background</h2>
              <p className="tour-body">Which photo should be behind your story?</p>
              <div className="story-pick-grid">
                {photoChoices.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="story-pick"
                    onClick={() => buildStory(c.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.url} alt="" />
                  </button>
                ))}
                <button
                  type="button"
                  className="story-pick story-pick-none"
                  onClick={() => buildStory("none")}
                >
                  No photo
                </button>
              </div>
              <div className="tour-nav">
                <span />
                <button type="button" className="tour-back" onClick={() => setPicking(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        busy &&
        !preview &&
        !err &&
        createPortal(
          <div className="tour-overlay" role="dialog" aria-modal="true">
            <div className="tour-card pm-card story-building">
              <div className="story-spinner" />
              <h2 className="tour-title">Creating your story…</h2>
              <p className="tour-body">Building your shareable graphic — one sec.</p>
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        done &&
        createPortal(
          <div className="tour-overlay" role="dialog" aria-modal="true">
            <div className="tour-card pm-card story-building">
              <div className="tour-icon">{done === "saved" ? "✅" : "🎉"}</div>
              <h2 className="tour-title">
                {done === "saved" ? "Saved to your Photos" : "Shared!"}
              </h2>
              <p className="tour-body">
                {done === "saved"
                  ? "Open Instagram → your Story → and pick it from your camera roll."
                  : "Your story is on its way. Nice work today."}
              </p>
              <button type="button" className="tour-action" onClick={() => setDone(null)}>
                Done
              </button>
            </div>
          </div>,
          document.body,
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
                    <button type="button" className="tour-back" onClick={saveImage}>
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
