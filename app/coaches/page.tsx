import type { Metadata } from "next";
import { SalesPage } from "@/components/marketing/SalesPage";

export const metadata: Metadata = {
  title: "Athletx for Coaches — recruit to your roster needs",
  description:
    "Post the exact spots you're recruiting for. Players who fit show interest, ranked best-fit first. Built for D2, D3, NAIA and JUCO baseball. Join the waitlist.",
  openGraph: {
    title: "Athletx for Coaches — recruit to your roster needs",
    description:
      "Post what you need. The players who fit come to you, ranked best-fit first. Built for small-college baseball.",
    images: ["/marketing/og-twosided.png"],
  },
};

export default function CoachesLanding() {
  return <SalesPage audience="coach" />;
}
