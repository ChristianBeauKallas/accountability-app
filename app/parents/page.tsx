import type { Metadata } from "next";
import { SalesPage } from "@/components/marketing/SalesPage";

export const metadata: Metadata = {
  title: "Athletx for Parents — make the recruiting money count",
  description:
    "You've spent thousands on showcases and camps. Athletx gets your player seen by the college programs that actually fit — by fit, not by budget — with every opportunity visible to you and a response every time.",
  openGraph: {
    title: "Athletx for Parents — make the recruiting money count",
    description:
      "Get your player in front of the coaches who actually want them — the whole process, finally in the open.",
    images: ["/marketing/og-twosided.png"],
  },
};

export default function ParentsLanding() {
  return <SalesPage audience="parent" />;
}
