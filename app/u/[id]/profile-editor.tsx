"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfileEditor({
  userId,
  displayName,
  avatarUrl,
}: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(displayName);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState(false);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setPreview(URL.createObjectURL(file));
    const supabase = createClient();

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) {
      setError(upErr.message);
      setBusy(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("id", userId);
    setBusy(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    router.refresh();
  }

  async function saveName() {
    if (!name.trim() || name.trim() === displayName) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() })
      .eq("id", userId);
    setBusy(false);
    if (error) setError(error.message);
    else {
      setSavedName(true);
      router.refresh();
    }
  }

  return (
    <div className="profile-editor">
      <button
        type="button"
        className="avatar-edit"
        onClick={() => fileInput.current?.click()}
        disabled={busy}
        aria-label="Change profile picture"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="avatar-lg" src={preview} alt="" />
        ) : (
          <span className="avatar-lg avatar-fallback">
            {name.trim().charAt(0).toUpperCase() || "?"}
          </span>
        )}
        <span className="avatar-edit-badge">📷</span>
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={onPhoto}
      />

      <div className="name-edit">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSavedName(false);
          }}
          onBlur={saveName}
          aria-label="Display name"
        />
        {savedName && <span className="saved-tick">saved ✓</span>}
      </div>

      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}
