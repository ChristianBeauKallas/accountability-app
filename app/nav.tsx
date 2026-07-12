"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function BottomNav() {
  const pathname = usePathname();
  const [pending, setPending] = useState<string | null>(null);

  // Clear the pending highlight once navigation lands.
  useEffect(() => setPending(null), [pathname]);

  // Hidden on auth screens.
  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) return null;

  const items = [
    { href: "/", label: "Feed", icon: "🏠", match: (p: string) => p === "/" },
    {
      href: "/chat",
      label: "Chat",
      icon: "💬",
      match: (p: string) => p.startsWith("/chat"),
    },
    {
      href: "/me",
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
