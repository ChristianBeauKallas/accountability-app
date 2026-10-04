/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Film, Trash2, Send, Megaphone, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/format";
import type { ProgramPost, ProgramPostKind, MediaType } from "@/lib/types";

const MAX_BYTES = 50 * 1024 * 1024;

export function ProgramFeed({
  programId,
  uploaderId,
  kind,
  editable,
}: {
  programId: string;
  uploaderId: string;
  kind: ProgramPostKind;
  editable: boolean;
}) {
  const supabase = createClient();
  const [posts, setPosts] = useState<ProgramPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("program_posts")
        .select("*")
        .eq("program_id", programId)
        .eq("kind", kind)
        .order("created_at", { ascending: false });
      if (active) {
        setPosts((data ?? []) as ProgramPost[]);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, kind]);

  async function remove(post: ProgramPost) {
    if (!confirm("Delete this post?")) return;
    setPosts((cur) => cur.filter((p) => p.id !== post.id));
    await supabase.from("program_posts").delete().eq("id", post.id);
    if (post.media_url) {
      const marker = "/player-media/";
      const i = post.media_url.indexOf(marker);
      if (i !== -1) {
        await supabase.storage
          .from("player-media")
          .remove([post.media_url.slice(i + marker.length)]);
      }
    }
  }

  return (
    <div className="space-y-4">
      {editable && (
        <Composer
          programId={programId}
          uploaderId={uploaderId}
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
  post: ProgramPost;
  editable: boolean;
  onDelete: () => void;
}) {
  return (
    <Card padded={false} className="overflow-hidden">
      {post.media_url && (
        <div className="bg-ink/5">
          {post.media_type === "video" ? (
            <video src={post.media_url} controls playsInline className="w-full max-h-[70dvh] bg-black" />
          ) : (
            <img src={post.media_url} alt="" className="w-full object-cover" loading="lazy" />
          )}
        </div>
      )}
      <div className="p-4">
        {post.body && (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
            {post.body}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-2">{timeAgo(post.created_at)}</span>
          {editable && (
            <button onClick={onDelete} className="text-muted-2 hover:text-warm-text" aria-label="Delete post">
              <Trash2 size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function Composer({
  programId,
  uploaderId,
  kind,
  onPosted,
}: {
  programId: string;
  uploaderId: string;
  kind: ProgramPostKind;
  onPosted: (post: ProgramPost) => void;
}) {
  const supabase = createClient();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const isFacility = kind === "facility";

  function pick(f: File | null) {
    setError("");
    if (f && f.size > MAX_BYTES) {
      setError("That file is over 50MB — try a smaller one.");
      return;
    }
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  const canPost = isFacility ? !!file : !!body.trim() || !!file;

  async function post() {
    setError("");
    if (!canPost) return;
    setBusy(true);

    let mediaUrl: string | null = null;
    let mediaType: MediaType | null = null;

    if (file) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${uploaderId}/${programId}/${kind}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("player-media")
        .upload(path, file, { upsert: false });
      if (upErr) {
        setBusy(false);
        setError(upErr.message);
        return;
      }
      mediaUrl = supabase.storage.from("player-media").getPublicUrl(path).data.publicUrl;
      mediaType = file.type.startsWith("video") ? "video" : "image";
    }

    const { data, error: insErr } = await supabase
      .from("program_posts")
      .insert({
        program_id: programId,
        kind,
        body: body.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
        created_by: uploaderId,
      })
      .select("*")
      .single();

    setBusy(false);
    if (insErr || !data) {
      setError(insErr?.message ?? "Couldn't post. Try again.");
      return;
    }
    onPosted(data as ProgramPost);
    setBody("");
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Card className="space-y-3">
      {!isFacility ? (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share program news — a commitment, a result, a camp…"
          maxLength={500}
          className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink placeholder:text-muted-2 outline-none"
          rows={3}
        />
      ) : (
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Caption (e.g. Our new indoor cage)"
          maxLength={200}
          className="w-full bg-transparent text-[15px] text-ink placeholder:text-muted-2 outline-none"
        />
      )}

      {preview && (
        <div className="relative overflow-hidden rounded-input bg-ink/5">
          {file?.type.startsWith("video") ? (
            <video src={preview} className="max-h-60 w-full bg-black" controls playsInline />
          ) : (
            <img src={preview} alt="" className="max-h-60 w-full object-cover" />
          )}
          <button
            onClick={() => pick(null)}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-pill bg-ink/70 text-surface"
            aria-label="Remove attachment"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-warm-text">{error}</p>}

      <div className="flex items-center justify-between">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-accent">
          {isFacility ? (
            <ImagePlus size={18} strokeWidth={2} aria-hidden />
          ) : (
            <Film size={18} strokeWidth={2} aria-hidden />
          )}
          {isFacility ? "Photo / video" : "Add media"}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
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

function EmptyFeed({
  kind,
  editable,
}: {
  kind: ProgramPostKind;
  editable: boolean;
}) {
  const isFacility = kind === "facility";
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-accent-soft text-accent">
        {isFacility ? (
          <ImagePlus size={22} strokeWidth={2} aria-hidden />
        ) : (
          <Megaphone size={22} strokeWidth={2} aria-hidden />
        )}
      </span>
      <p className="font-display text-lg font-semibold text-ink">
        {isFacility ? "No facility photos yet" : "No updates yet"}
      </p>
      <p className="max-w-xs text-sm text-body-2">
        {editable
          ? isFacility
            ? "Show off the field, locker room, weight room and campus."
            : "Post news so recruits can follow your program."
          : isFacility
            ? "This program hasn't posted facility photos yet."
            : "This program hasn't posted any updates yet."}
      </p>
    </div>
  );
}
