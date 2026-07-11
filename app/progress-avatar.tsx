import { Avatar } from "./avatar";

// Avatar wrapped in a neon progress ring (fraction of activities logged today).
export function ProgressAvatar({
  name,
  url,
  progress,
  done = false,
  size = 60,
}: {
  name: string;
  url: string | null;
  progress: number;
  done?: boolean;
  size?: number;
}) {
  const stroke = 3.5;
  const r = (size - stroke) / 2 - 1;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = circumference * (1 - clamped);

  return (
    <span className="pa-wrap" style={{ width: size, height: size }}>
      <svg
        className="pa-ring"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={c}
          cy={c}
          r={r}
          className="pa-bg"
          strokeWidth={stroke}
          fill="none"
        />
        {clamped > 0 && (
          <circle
            cx={c}
            cy={c}
            r={r}
            className="pa-fg"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${c} ${c})`}
          />
        )}
      </svg>
      <span className="pa-inner">
        <Avatar name={name} url={url} />
      </span>
      {done && <span className="pa-check">✓</span>}
    </span>
  );
}
