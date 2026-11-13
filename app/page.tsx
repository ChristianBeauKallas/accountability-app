import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/wellness-server";
import { RunnerMark } from "@/components/wellness/Runner";

export const dynamic = "force-dynamic";

export default async function Home() {
  const viewer = await getViewer();
  if (viewer) redirect("/feed");

  return (
    <main
      className="relative flex min-h-dvh flex-col overflow-hidden px-[30px] pb-9 pt-12 text-center"
      style={{
        background:
          "radial-gradient(135% 85% at 50% -5%, rgb(var(--c-accent-soft)), transparent 58%)",
      }}
    >
      <div
        className="animate-glow pointer-events-none absolute left-1/2 top-[-70px] h-[300px] w-[300px] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgb(var(--c-accent)), transparent 68%)",
          filter: "blur(8px)",
          opacity: 0.14,
        }}
      />
      <div className="relative z-10 font-display text-xs font-semibold uppercase tracking-[0.24em] text-accent">
        Team Wellness
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-7">
        <RunnerMark tile={80} icon={40} radius={25} halo bob />
        <h1 className="font-display text-[2.35rem] font-bold leading-[1.04] tracking-tight text-ink">
          Move together.
          <br />
          <span className="text-accent">Earn together.</span>
        </h1>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3">
        <Link
          href="/setup"
          className="flex h-[52px] w-full items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark"
        >
          Set up a program
        </Link>
        <Link
          href="/login"
          className="p-1.5 font-semibold text-body-2 transition-colors hover:text-accent"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
