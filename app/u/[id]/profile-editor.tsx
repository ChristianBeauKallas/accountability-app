"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfileEditor({
  userId,
  displayName,
  avatarUrl,
  bio,
}: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(displayName);
  const [bioText, setBioText] = useState(bio ?? "");
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState(false);

  async function saveBio() {
    const trimmed = bioText.trim();
    if (trimmed === (bio ?? "")) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ bio: trimmed || null })
      .eq("id", userId);
    if (error) setError(error.message);
    else router.refresh();
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setPreview(URL.createObjectURL(file));

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/avatar", {
      method: "POST",
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      body: form,
    });
    setBusy(false);

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Couldn't save photo — try again.");
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

      <div className="profile-id-text">
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
        <input
          className="bio-edit"
          value={bioText}
          maxLength={90}
          placeholder="What are you working on?"
          onChange={(e) => setBioText(e.target.value)}
          onBlur={saveBio}
          aria-label="Bio"
        />
        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  );
}
