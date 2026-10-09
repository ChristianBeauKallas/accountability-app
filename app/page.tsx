import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SalesPage } from "@/components/marketing/SalesPage";

export const metadata: Metadata = {
  title: "Athletx — recruit to your roster needs",
  description:
    "Coaches post the spots they're recruiting for. The players who fit show their interest, ranked best-fit first. Built for small-college baseball. Join the waitlist.",
  openGraph: {
    title: "Athletx — college baseball, matched by fit",
    description:
      "Coaches post what they need. The players who fit come to them, ranked best-fit first.",
    images: ["/marketing/og-twosided.png"],
  },
};

// Public front door. Logged-out visitors see the sales page; logged-in users
// go straight into the app.
export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarded")
      .eq("id", user.id)
      .single();

    if (!profile) redirect("/welcome");
    if (!profile.onboarded) redirect("/onboarding");
    redirect(profile.role === "coach" ? "/inbox" : "/fits");
  }

  return <SalesPage audience="both" />;
}
