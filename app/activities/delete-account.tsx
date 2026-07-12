"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Danger zone: permanently delete the current account. Requires typing DELETE
// to confirm, then hits the server route and signs out.
export default function DeleteAccount({ ownsGroup }: { ownsGroup: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/delete-account", {
      method: "POST",
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Couldn't delete the account — try again.");
      setBusy(false);
      return;
    }
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="danger-zone">
      <h2>Delete account</h2>
      <p className="danger-hint">
        Permanently removes your account and all your data
        {ownsGroup ? ", including the group you own and everyone's history in it" : ""}
        . This can&apos;t be undone.
      </p>

      {!confirming ? (
        <button
          type="button"
          className="danger-btn"
          onClick={() => setConfirming(true)}
        >
          Delete my account
        </button>
      ) : (
        <div className="danger-confirm">
          <label htmlFor="confirmDelete">
            Type <b>DELETE</b> to confirm
          </label>
          <input
            id="confirmDelete"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
          <div className="danger-actions">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setConfirming(false);
                setText("");
                setError(null);
              }}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="danger-btn"
              onClick={del}
              disabled={busy || text.trim() !== "DELETE"}
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </button>
          </div>
          {error && <p className="auth-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
