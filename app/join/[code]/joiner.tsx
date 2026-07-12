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

      // Look up the group's name from the code (works even when signed out) so
      // the invite screen can greet them by group.
      supabase
        .rpc("group_name_by_code", { code })
        .then(({ data }) => {
          if (typeof data === "string" && data) setGroupName(data);
        });

      const {
        data: { session },
      } = await supabase.auth.getSession();

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
