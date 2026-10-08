/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Film,
  Trash2,
  Send,
  MessageSquare,
  Play,
  ExternalLink,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/format";
import type { PlayerPost, PostKind, MediaType } from "@/lib/types";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB

export function PlayerFeed({
  playerId,
  kind,
  editable,
}: {
  playerId: string;
  kind: PostKind;
  editable: boolean;
}) {
  const supabase = createClient();
  const [posts, setPosts] = useState<PlayerPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("player_posts")
        .select("*")
        .eq("player_id", playerId)
        .eq("kind", kind)
        .order("created_at", { ascending: false });
      if (active) {
        setPosts((data ?? []) as PlayerPost[]);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, kind]);

  async function remove(post: PlayerPost) {
    if (!confirm("Delete this post?")) return;
    setPosts((cur) => cur.filter((p) => p.id !== post.id));
    await supabase.from("player_posts").delete().eq("id", post.id);
    if (post.media_url) {
      const marker = "/player-media/";
      const i = post.media_url.indexOf(marker);
      if (i !== -1) {
        const path = post.media_url.slice(i + marker.length);
        await supabase.storage.from("player-media").remove([path]);
      }
    }
  }

  return (
    <div className="space-y-4">
      {editable && (
        <Composer
          playerId={playerId}
          kind={kind}
          onPosted={(p) => setPosts((cur) => [p, ...cur])}
        />
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-2">Loading…</p>
      ) : posts.length === 0 ? (
        <EmptyFeed kind={kind} editable={editable} />
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} editable={editable} onDelete={() => remove(post)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PostCard({
  post,
  editable,
  onDelete,
}: {
  post: PlayerPost;
  editable: boolean;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isVideo = post.media_type === "video";
  // A highlight added as a link (YouTube/Hudl/X…) rather than an uploaded
  // file — we don't host it, so link out instead of trying to play it inline.
  const isExternal =
    !!post.media_url &&
    /^https?:\/\//i.test(post.media_url) &&
    !post.media_url.includes("/storage/v1/object/public/");
  const externalHost = (() => {
    if (!isExternal || !post.media_url) return "";
    try {
      return new URL(post.media_url).hostname.replace(/^www\./, "");
    } catch {
      return "link";
    }
  })();

  return (
    <Card className="space-y-3">
      {/* Caption first, Twitter-style */}
      {post.body && (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
          {post.body}
        </p>
      )}

      {/* External highlight link — open in a new tab. */}
      {post.media_url && isExternal && (
        <a
          href={post.media_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-input border border-border bg-surface px-4 py-3 hover:bg-chip"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-accent">
            <Play size={18} strokeWidth={2.5} className="ml-0.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">
              Watch highlights
            </span>
            <span className="block truncate text-xs text-muted-2">
              {externalHost}
            </span>
          </span>
          <ExternalLink size={16} strokeWidth={2} aria-hidden className="text-muted-2" />
        </a>
      )}

      {/* Square, cropped media — tap to open full */}
      {post.media_url && !isExternal && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative block aspect-square w-full overflow-hidden rounded-input bg-black/5"
          aria-label="Open media"
        >
          {isVideo ? (
            <>
              <video
                src={post.media_url}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/15">
                <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-black/55 text-white">
                  <Play size={22} strokeWidth={2.5} className="ml-0.5" aria-hidden />
                </span>
              </span>
            </>
          ) : (
            <img
              src={post.media_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}
        </button>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-2">{timeAgo(post.created_at)}</span>
        {editable && (
          <button
            onClick={onDelete}
            className="text-muted-2 hover:text-danger"
            aria-label="Delete post"
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      {open && post.media_url && !isExternal && (
        <Lightbox url={post.media_url} isVideo={isVideo} onClose={() => setOpen(false)} />
      )}
    </Card>
  );
}

function Lightbox({
  url,
  isVideo,
  onClose,
}: {
  url: string;
  isVideo: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-pill bg-white/10 text-white"
      >
        <X size={22} strokeWidth={2} />
      </button>
      {isVideo ? (
        <video
          src={url}
          controls
          autoPlay
          playsInline
          onClick={(e) => e.stopPropagation()}
          className="max-h-[85dvh] max-w-full rounded-lg bg-black"
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt=""
          onClick={(e) => e.stopPropagation()}
          className="max-h-[85dvh] max-w-full rounded-lg object-contain"
        />
      )}
    </div>
  );
}

function Composer({
  playerId,
  kind,
  onPosted,
}: {
  playerId: string;
  kind: PostKind;
  onPosted: (post: PlayerPost) => void;
}) {
  const supabase = createClient();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const isHighlight = kind === "highlight";

  function pick(f: File | null) {
    setError("");
    if (f && f.size > MAX_BYTES) {
      setError("That file is over 50MB — try a shorter clip or smaller image.");
      return;
    }
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  const canPost = isHighlight ? !!file : !!body.trim() || !!file;

  async function post() {
    setError("");
    if (!canPost) return;
    setBusy(true);

    let mediaUrl: string | null = null;
    let mediaType: MediaType | null = null;

    if (file) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${playerId}/${kind}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("player-media")
        .upload(path, file, { upsert: false });
      if (upErr) {
        setBusy(false);
        setError(upErr.message);
        return;
      }
      mediaUrl = supabase.storage.from("player-media").getPublicUrl(path)
        .data.publicUrl;
      mediaType = file.type.startsWith("video") ? "video" : "image";
    }

    const { data, error: insErr } = await supabase
      .from("player_posts")
      .insert({
        player_id: playerId,
        kind,
        body: body.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
      })
      .select("*")
      .single();

    setBusy(false);
    if (insErr || !data) {
      setError(insErr?.message ?? "Couldn't post. Try again.");
      return;
    }
    onPosted(data as PlayerPost);
    setBody("");
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Card className="space-y-3">
      {!isHighlight && (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share an update…"
          maxLength={500}
          className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink placeholder:text-muted-2 outline-none"
          rows={2}
        />
      )}
      {isHighlight && (
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a caption (optional)"
          maxLength={200}
          className="w-full bg-transparent text-[15px] text-ink placeholder:text-muted-2 outline-none"
        />
      )}

      {preview && (
        <div className="relative overflow-hidden rounded-input bg-white/5">
          {file?.type.startsWith("video") ? (
            <video src={preview} className="max-h-60 w-full bg-black" controls playsInline />
          ) : (
            <img src={preview} alt="" className="max-h-60 w-full object-cover" />
          )}
          <button
            onClick={() => pick(null)}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-pill bg-black/70 text-surface"
            aria-label="Remove attachment"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center justify-between">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-accent">
          {isHighlight ? (
            <Film size={18} strokeWidth={2} aria-hidden />
          ) : (
            <ImagePlus size={18} strokeWidth={2} aria-hidden />
          )}
          {isHighlight ? "Choose video" : "Photo / video"}
          <input
            ref={fileRef}
            type="file"
            accept={isHighlight ? "video/*,image/*" : "image/*,video/*"}
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </label>
        <Button onClick={post} disabled={!canPost || busy}>
          {busy ? "Posting…" : "Post"}
          {!busy && <Send size={16} strokeWidth={2} aria-hidden />}
        </Button>
      </div>
    </Card>
  );
}

function EmptyFeed({ kind, editable }: { kind: PostKind; editable: boolean }) {
  const isHighlight = kind === "highlight";
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-accent-soft text-accent">
        {isHighlight ? (
          <Film size={22} strokeWidth={2} aria-hidden />
        ) : (
          <MessageSquare size={22} strokeWidth={2} aria-hidden />
        )}
      </span>
      <p className="font-display text-lg font-semibold text-ink">
        {isHighlight ? "No highlights yet" : "No updates yet"}
      </p>
      <p className="max-w-xs text-sm text-body-2">
        {editable
          ? isHighlight
            ? "Post your best clips — coaches scan highlights first."
            : "Post an update so coaches can follow your season."
          : isHighlight
            ? "This player hasn't posted highlights yet."
            : "This player hasn't posted any updates yet."}
      </p>
    </div>
  );
}
