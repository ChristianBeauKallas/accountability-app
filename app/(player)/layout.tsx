import { requireProfile } from "@/lib/auth";
import { TabBar } from "@/components/ui/TabBar";
import { NotificationNudge } from "@/components/NotificationNudge";
import { FeedbackNudge } from "@/components/FeedbackNudge";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProfile("player");
  return (
    <div
      className="min-h-dvh"
      style={{ paddingBottom: "calc(84px + env(safe-area-inset-bottom) + 28px)" }}
    >
      {children}
      <TabBar role="player" />
      <NotificationNudge />
      <FeedbackNudge />
    </div>
  );
}
