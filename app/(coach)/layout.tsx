import { requireProfile } from "@/lib/auth";
import { TabBar } from "@/components/ui/TabBar";
import { ThemeToggle } from "@/components/ThemeToggle";

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
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-40 mx-auto flex w-full max-w-app justify-end px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
      >
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>
      {children}
      <TabBar role="coach" />
    </div>
  );
}
