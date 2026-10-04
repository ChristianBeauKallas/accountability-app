import { requireProfile } from "@/lib/auth";
import { TabBar } from "@/components/ui/TabBar";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProfile("player");
  return (
    <div className="min-h-dvh pb-[84px]">
      {children}
      <TabBar role="player" />
    </div>
  );
}
