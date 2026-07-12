"use client";

import { useEffect, useState } from "react";

// Today's date in the viewer's own timezone, e.g. "Saturday - 07/12/2026".
// Rendered after mount to avoid a server/client timezone hydration mismatch.
export default function HeaderDate() {
  const [text, setText] = useState("");

  useEffect(() => {
    const d = new Date();
    const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
    const mdy = d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    setText(`${weekday} - ${mdy}`);
  }, []);

  return <span>{text}</span>;
}
