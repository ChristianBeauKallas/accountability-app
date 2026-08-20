"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Share-to-story button for a plan recap. Two-step by design: the first tap
// builds the 9:16 graphic server-side and shows a preview; the actual
// navigator.share() fires from a fresh tap on the preview (iOS only allows
// share() inside a live user gesture, which the await would otherwise consume).
export default function StoryShare({ postId }: { postId: string }) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);

  useEffect(() => setMounted(true), []);

  async function build() {
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

  return (
    <>
      <button
        type="button"
        className="pr-share"
        onClick={build}
        disabled={busy}
        aria-label="Share to story"
      >
        {busy ? "Creating…" : "📸 Share"}
      </button>

      {mounted &&
        (err || preview) &&
        createPortal(
          <div className="tour-overlay" role="dialog" aria-modal="true">
            <div className="tour-card pm-card">
              {preview ? (
                <>
                  <h2 className="tour-title">Ready to share</h2>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="story-preview-img"
                    src={preview.url}
                    alt="Your story graphic"
                  />
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
    </>
  );
}
