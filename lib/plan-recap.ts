import { createClient } from "@/lib/supabase/client";

// Fire-and-forget: rebuild the client's plan-recap post in the group feed for
// a given day after they log something. Best-effort — never blocks the UI.
export async function syncPlanRecap(day: string): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await fetch("/api/plan-recap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ day }),
    });
  } catch {
    /* the feed just won't update this tick; the next log will fix it */
  }
}
