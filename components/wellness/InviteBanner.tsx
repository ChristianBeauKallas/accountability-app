"use client";

import { useEffect, useState } from "react";

export function InviteBanner({ code }: { code: string }) {
  const [hidden, setHidden] = useState(false);
  const [path, setPath] = useState(`/join/${code}`);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPath(`${window.location.origin}/join/${code}`);
  }, [code]);

  if (hidden) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const display = path.replace(/^https?:\/\//, "");

  return (
    <div className="relative rounded-card bg-gradient-to-br from-accent to-accent-dark p-4 text-white shadow-card">
      <button
        onClick={() => setHidden(true)}
        aria-label="Dismiss"
        className="absolute right-3 top-2.5 text-lg leading-none text-white/80"
      >
        ×
      </button>
      <h4 className="font-display text-base font-bold">Invite your team</h4>
      <p className="mb-3 mt-0.5 text-[0.78rem] leading-snug text-white/90">
        Share this link so teammates can create their own account and enroll.
      </p>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate rounded-[10px] bg-white/20 px-2.5 py-2 text-[0.76rem] font-semibold">
          {display}
        </span>
        <button
          onClick={copy}
          className="flex-none rounded-[10px] bg-white px-3 py-2 font-display text-[0.8rem] font-bold text-accent"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
