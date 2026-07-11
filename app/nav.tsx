"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  // Hidden on auth screens.
  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) return null;

  const items = [
    { href: "/", label: "Board", icon: "🏠", match: (p: string) => p === "/" },
    {
      href: "/chat",
      label: "Chat",
      icon: "💬",
      match: (p: string) => p.startsWith("/chat"),
    },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`nav-item ${it.match(pathname) ? "active" : ""}`}
        >
          <span className="nav-icon">{it.icon}</span>
          <span className="nav-label">{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}
