"use client";

import { useEffect, useState } from "react";

// A date stamp under the author's name, e.g. "Jul 12 · 11:40 AM", in the
// viewer's own timezone. Rendered after mount to avoid a hydration mismatch.
export default function PostDate({ iso }: { iso: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const time = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    setText(`${date} · ${time}`);
  }, [iso]);

  return <span className="post-date">{text}</span>;
}
