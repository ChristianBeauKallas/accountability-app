import { requireProfile } from "@/lib/auth";
import { TabBar } from "@/components/ui/TabBar";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProfile("coach");
  return (
    <div className="min-h-dvh pb-[84px]">
      {children}
      <TabBar role="coach" />
    </div>
  );
}
