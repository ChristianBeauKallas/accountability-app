import type { Metadata, Viewport } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import SwRegister from "./sw-register";
import InstallPrompt from "./install-prompt";
import BottomNav from "./nav";
import TimezoneSync from "./timezone-sync";
import VersionWatch from "./version-watch";

export const metadata: Metadata = {
  applicationName: "Get Better",
  title: "Get Better",
  description: "Show up. Every day.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Get Better",
  },
  icons: {
    icon: "/favicon-32.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#07090c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch the current user once so the nav can link straight to their profile
  // (skips the /me → /u/[id] redirect hop).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Coaching nav flags: "My Plan" shows for anyone with a plan (a client, or
  // someone running their own plan); "My Team" shows only if you hold someone
  // else accountable.
  let hasPlan = false;
  let hasTeam = false;
  if (user) {
    const { data: relFlags } = await supabase
      .from("coaching_relationships")
      .select("coach_id, client_id")
      .or(`coach_id.eq.${user.id},client_id.eq.${user.id}`);
    for (const r of relFlags ?? []) {
      if (r.client_id === user.id) hasPlan = true;
      if (r.coach_id === user.id && r.client_id !== user.id) hasTeam = true;
    }
  }

  return (
    <html lang="en">
      <body>
        {children}
        <BottomNav userId={user?.id ?? null} hasPlan={hasPlan} hasTeam={hasTeam} />
        {/* Only nudge to install once they're signed in — it must never sit on
            top of the login / signup / invite flow. */}
        {user && <InstallPrompt />}
        {user && <TimezoneSync />}
        <VersionWatch />
        <SwRegister />
      </body>
    </html>
  );
}
