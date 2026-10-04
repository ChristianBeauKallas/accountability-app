import type { SVGProps } from "react";

// Stroke-style baseball that matches the lucide icon set (fill none,
// currentColor, round joins). Accepts size / strokeWidth like a lucide icon.
export function BaseballIcon({
  size = 24,
  strokeWidth = 2,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M7 4.2c2.2 2 3.4 4.7 3.4 7.8S9.2 17.8 7 19.8" />
      <path d="M17 4.2c-2.2 2-3.4 4.7-3.4 7.8s1.2 5.8 3.4 7.8" />
    </svg>
  );
}
