"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Silently keep profiles.timezone in sync with the device's real timezone, so
// meal nudges and dead-group reminders fire at the right local hour. Writes
// only when the detected zone changed since last time (localStorage guard), so
// it's a no-op on the vast majority of loads.
export default function TimezoneSync() {
  useEffect(() => {
    (async () => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!tz) return;
        if (localStorage.getItem("gb-tz") === tz) return;

        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from("profiles")
          .update({ timezone: tz })
          .eq("id", user.id);
        if (!error) localStorage.setItem("gb-tz", tz);
      } catch {
        // Best-effort — never surface a timezone write failure to the user.
      }
    })();
  }, []);
  return null;
}
