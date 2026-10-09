import type { Metadata } from "next";
import { SalesPage } from "@/components/marketing/SalesPage";

export const metadata: Metadata = {
  title: "Athletx for Players — get recruited by the right fit",
  description:
    "Build one profile. See every open college spot ranked by how well you fit. Show interest with a tap and always hear back. For HS recruits, JUCO and transfers. Join the waitlist.",
  openGraph: {
    title: "Athletx for Players — get recruited by the right fit",
    description:
      "See every open spot ranked by how well you fit, show interest with a tap, and always hear back.",
    images: ["/marketing/og-twosided.png"],
  },
};

export default function PlayersLanding() {
  return <SalesPage audience="player" />;
}
