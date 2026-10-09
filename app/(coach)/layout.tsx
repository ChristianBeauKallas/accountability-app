import { requireProfile } from "@/lib/auth";
import { TabBar } from "@/components/ui/TabBar";
import { NotificationNudge } from "@/components/NotificationNudge";
import { AppTour } from "@/components/tour/AppTour";
import { FeedbackNudge } from "@/components/FeedbackNudge";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProfile("coach");
  return (
    <div
      className="min-h-dvh"
      style={{ paddingBottom: "calc(84px + env(safe-area-inset-bottom) + 28px)" }}
    >
      {children}
      <TabBar role="coach" />
      <NotificationNudge />
      <AppTour />
      <FeedbackNudge />
    </div>
  );
}
