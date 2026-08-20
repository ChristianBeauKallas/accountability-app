"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function BottomNav({
  userId,
  hasPlan,
  hasTeam,
}: {
  userId?: string | null;
  hasPlan?: boolean;
  hasTeam?: boolean;
}) {
  const pathname = usePathname();
  const [pending, setPending] = useState<string | null>(null);

  // The root layout computes these once and is preserved across client-side
  // navigations, so if that single render happened during the post-login auth
  // race the tabs can get stuck missing. Re-derive them from the live browser
  // session on mount (and keep the resolved user id for the profile link).
  const [uid, setUid] = useState<string | null>(userId ?? null);
  const [plan, setPlan] = useState<boolean>(!!hasPlan);
  const [team, setTeam] = useState<boolean>(!!hasTeam);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const id = userId ?? user?.id ?? null;
        if (!id || cancelled) return;
        if (!userId) setUid(id);
        const { data, error } = await supabase
          .from("coaching_relationships")
          .select("coach_id, client_id")
          .or(`coach_id.eq.${id},client_id.eq.${id}`);
        if (error || cancelled) return;
        let p = false;
        let t = false;
        for (const r of data ?? []) {
          if (r.client_id === id) p = true;
          if (r.coach_id === id && r.client_id !== id) t = true;
        }
        setPlan(p);
        setTeam(t);
      } catch {
        // Keep whatever the server passed; never blank the nav on an error.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Clear the pending highlight once navigation lands.
  useEffect(() => setPending(null), [pathname]);

  // Hidden on auth / invite screens (nothing to navigate to before joining).
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/join")
  )
    return null;

  const items = [
    { href: "/", label: "Feed", icon: "🏠", match: (p: string) => p === "/" },
    {
      href: "/chat",
      label: "Chat",
      icon: "💬",
      match: (p: string) => p.startsWith("/chat"),
    },
    ...(plan
      ? [
          {
            href: "/coaching",
            label: "My Plan",
            icon: "📋",
            match: (p: string) => p.startsWith("/coaching"),
          },
        ]
      : []),
    ...(team
      ? [
          {
            href: "/coach",
            label: "My Team",
            icon: "👥",
            match: (p: string) => p.startsWith("/coach"),
          },
        ]
      : []),
    {
      // Link straight to the user's profile when we know it, skipping the
      // /me redirect hop; fall back to /me if not signed in yet.
      href: uid ? `/u/${uid}` : "/me",
      label: "My Profile",
      icon: "👤",
      match: (p: string) => p.startsWith("/me") || p.startsWith("/u/"),
    },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((it) => {
        const here = it.match(pathname);
        const active = here || pending === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            prefetch
            onClick={() => !here && setPending(it.href)}
            className={`nav-item ${active ? "active" : ""} ${
              pending === it.href && !here ? "pending" : ""
            }`}
          >
            <span className="nav-icon">{it.icon}</span>
            <span className="nav-label">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
