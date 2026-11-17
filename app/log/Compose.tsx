"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BobLoader } from "@/components/wellness/BobLoader";
import { Input, Textarea } from "@/components/ui/Field";

const MAX_PHOTOS = 4;

export function Compose({
  programId,
  minsPerDay,
}: {
  programId: string;
  minsPerDay: number;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [place, setPlace] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [desc, setDesc] = useState("");
  const [dur, setDur] = useState(Math.max(minsPerDay, minsPerDay + 5));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setErr(null);
    setPhotos((prev) => {
      const room = MAX_PHOTOS - prev.length;
      const next = files
        .slice(0, room)
        .map((f) => ({ file: f, url: URL.createObjectURL(f) }));
      return [...prev, ...next];
    });
    e.target.value = "";
  }

  function removePhoto(i: number) {
    setPhotos((prev) => {
      const target = prev[i];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, j) => j !== i);
    });
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setErr("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!place.trim()) setPlace("Current location");
        setLocating(false);
      },
      () => {
        setErr("Couldn't get your location — you can still type a spot.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function post() {
    setErr(null);
    if (!photos.length) {
      setErr("Add a photo of your workout first.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const stamp = Date.now();
    const photo_urls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const { file } = photos[i];
      const path = `${user.id}/checkin-${stamp}-${i}`;
      const { error: upErr } = await supabase.storage
        .from("wellness")
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        setErr(upErr.message);
        setBusy(false);
        return;
      }
      photo_urls.push(
        supabase.storage.from("wellness").getPublicUrl(path).data.publicUrl,
      );
    }

    const { error } = await supabase.from("wl_checkins").insert({
      member_id: user.id,
      program_id: programId,
      photo_url: photo_urls[0],
      photo_urls,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      place: place.trim() || null,
      description: desc.trim() || null,
      duration_minutes: dur,
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    setDone(true);
  }

  const qualifies = dur >= minsPerDay;

  return (
    <main className="relative flex h-dvh flex-col">
      <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2.5 border-b border-border px-[18px] pb-2.5 pt-safe">
        <Link
          href="/feed"
          className="justify-self-start rounded-btn border border-border bg-surface px-2.5 py-[7px] text-sm font-semibold text-ink"
        >
          Cancel
        </Link>
        <h1 className="font-display text-base font-bold text-ink">Log movement</h1>
        <span aria-hidden />
      </header>

      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className="flex flex-col gap-3.5 p-[18px]">
          {/* photos */}
          {photos.length === 0 ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative flex aspect-square w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-border bg-chip text-center text-muted"
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              <span className="text-[0.84rem] font-semibold">Add photos</span>
              <span className="text-[0.72rem]">You, the gym, the trail — up to {MAX_PHOTOS}</span>
            </button>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {photos.map((p, i) => (
                <div
                  key={p.url}
                  className="relative aspect-square w-28 flex-none overflow-hidden rounded-xl border border-border bg-chip"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white backdrop-blur"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded-pill bg-black/60 px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide text-white backdrop-blur">
                      Cover
                    </span>
                  )}
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="grid aspect-square w-28 flex-none place-items-center rounded-xl border border-dashed border-border bg-chip text-muted"
                >
                  <span className="flex flex-col items-center gap-1">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span className="text-[0.66rem] font-semibold">Add</span>
                  </span>
                </button>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} />

          {/* location */}
          <div className="flex flex-col gap-2">
            <label className="pl-0.5 text-[0.76rem] font-semibold text-body-2">
              Tag a location <span className="font-normal text-muted">· optional</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={useLocation}
                className={`inline-flex flex-none items-center gap-1.5 rounded-pill border px-3 py-2 text-[0.76rem] font-semibold ${coords ? "border-accent bg-accent-soft text-accent" : "border-border bg-chip text-body-2"}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
                {locating ? "Locating…" : coords ? "Location set" : "Use my location"}
              </button>
              <Input
                placeholder="Add a spot"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* description */}
          <div className="flex flex-col gap-2">
            <label className="pl-0.5 text-[0.76rem] font-semibold text-body-2">What did you do?</label>
            <Textarea
              rows={2}
              placeholder="Morning run before work"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="min-h-[64px]"
            />
          </div>

          {/* duration */}
          <div className="flex flex-col gap-2">
            <label className="pl-0.5 text-[0.76rem] font-semibold text-body-2">How long did you move?</label>
            <div className="flex items-center gap-3.5">
              <button
                onClick={() => setDur((d) => Math.max(5, d - 5))}
                aria-label="less"
                className="h-10 w-10 flex-none rounded-btn border border-border bg-surface text-xl text-ink"
              >
                −
              </button>
              <div className="min-w-[92px] text-center">
                <span className="font-display text-[1.6rem] font-bold text-ink">{dur}</span>
                <span className="block text-[0.68rem] font-semibold text-muted">minutes</span>
              </div>
              <button
                onClick={() => setDur((d) => d + 5)}
                aria-label="more"
                className="h-10 w-10 flex-none rounded-btn border border-border bg-surface text-xl text-ink"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* bottom action bar */}
      <footer className="shrink-0 border-t border-border bg-surface px-[18px] pt-3 pb-safe">
        {err && <p className="mb-2 text-sm text-danger">{err}</p>}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-[0.76rem] font-semibold leading-snug">
            {qualifies ? (
              <span className="flex items-center gap-1.5 text-accent">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Qualifying day · {dur} min
              </span>
            ) : (
              <span className="text-muted">
                {minsPerDay - dur} more min to qualify
              </span>
            )}
          </div>
          <button
            onClick={post}
            disabled={busy}
            className="flex h-12 flex-none items-center justify-center rounded-cta bg-accent px-8 font-display text-[0.95rem] font-semibold text-surface shadow-[0_6px_16px_rgb(var(--c-accent)/0.35)] transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </footer>

      {busy && <BobLoader message="Posting your check-in…" />}

      {done && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-ground px-8 text-center">
          <div className="grid h-[86px] w-[86px] place-items-center rounded-full bg-accent-soft text-accent">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className="font-display text-[1.4rem] font-bold text-ink">Logged!</h2>
          <p className="max-w-[16rem] text-sm leading-relaxed text-body-2">
            {qualifies
              ? `Nice work — that's a qualifying day (${minsPerDay}+ min).`
              : "Nice work — every bit counts."}
          </p>
          <button
            onClick={() => {
              router.push("/feed");
              router.refresh();
            }}
            className="mt-3 flex h-[52px] items-center justify-center rounded-cta bg-accent px-7 font-display font-semibold text-surface transition-colors hover:bg-accent-dark"
          >
            See the feed
          </button>
        </div>
      )}
    </main>
  );
}
