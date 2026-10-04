import { requireProfile } from "@/lib/auth";
import { TabBar } from "@/components/ui/TabBar";

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
    </div>
  );
}
