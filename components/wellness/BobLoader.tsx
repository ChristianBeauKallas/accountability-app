import { RunnerMark } from "./Runner";

// Full-cover loading state: the little runner bobbing at a running pace with a
// message. Rendered inside a `relative` parent (absolute inset-0).
export function BobLoader({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-ground px-8 text-center">
      <RunnerMark tile={58} icon={30} radius={18} className="animate-bob-fast" />
      <p className="font-display text-lg font-semibold text-ink">{message}</p>
    </div>
  );
}
