import { requireProfile } from "@/lib/auth";
import { TabBar } from "@/components/ui/TabBar";
import { AppTour } from "@/components/tour/AppTour";
import { FeedbackNudge } from "@/components/FeedbackNudge";

export default async function FollowingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();
  return (
    <div
      className="min-h-dvh"
      style={{ paddingBottom: "calc(84px + env(safe-area-inset-bottom) + 28px)" }}
    >
      {children}
      <TabBar role={profile.role} />
      <AppTour />
      <FeedbackNudge />
    </div>
  );
}
