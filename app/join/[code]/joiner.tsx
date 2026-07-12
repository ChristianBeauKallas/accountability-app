"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Joiner({ code }: { code: string }) {
  const router = useRouter();
  const [state, setState] = useState<
    "checking" | "joining" | "need-auth" | "error"
  >("checking");
  const [groupName, setGroupName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();

      // Resolve the group name AND the session together before we decide what
      // to render. The name lookup (works signed-out) is a network round-trip
      // while getSession() is instant — awaiting both up front means the invite
      // screen paints once, already greeting them by group, instead of flashing
      // the generic fallback first and then swapping the name in.
      const [nameRes, sessionRes] = await Promise.all([
        supabase.rpc("group_name_by_code", { code }),
        supabase.auth.getSession(),
      ]);
      if (typeof nameRes.data === "string" && nameRes.data)
        setGroupName(nameRes.data);
      const session = sessionRes.data.session;

      if (!session) {
        // Remember the invite so we can join right after they sign up.
        try {
          localStorage.setItem("pendingInvite", code);
        } catch {
          /* ignore */
        }
        setState("need-auth");
        return;
      }

      setState("joining");
      const { error } = await supabase.rpc("join_group", { code });
      if (error) {
        setError(error.message);
        setState("error");
        return;
      }
      router.replace("/");
    })();
  }, [code, router]);

  if (state === "need-auth") {
    return (
      <main className="auth">
        <div className="auth-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="auth-icon"
            src="/icon-192.png"
            alt="Get Better"
            width={88}
            height={88}
          />
          <h1>
            {groupName ? (
              <>
                You&apos;re invited to join {groupName} on the Get Better app 💪
              </>
            ) : (
              <>You&apos;re invited to Get Better 💪</>
            )}
          </h1>
        </div>
        <p className="subtitle">Create an account (or sign in) to join.</p>
        <a className="join-cta" href="/login">
          Get started ›
        </a>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="auth">
        <h1>Get Better</h1>
        <div className="notice">Couldn&apos;t join: {error}</div>
        <a className="join-cta" href="/">
          Go to the app
        </a>
      </main>
    );
  }

  return (
    <main className="auth">
      <h1>Get Better</h1>
      <p className="subtitle">
        {groupName ? <>Joining {groupName}…</> : <>Joining the group…</>}
      </p>
    </main>
  );
}
