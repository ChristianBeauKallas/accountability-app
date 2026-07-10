import { createClient } from "@/lib/supabase/server";

// Always render fresh so you see new rows without redeploying.
export const dynamic = "force-dynamic";

type Goal = {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
};

export default async function Home() {
  // Trim in case a stray space/newline snuck into an env var when it was
  // pasted into the Vercel dashboard — a common cause of hard-to-spot errors.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const isConfigured = !!url && !!anonKey;

  let goals: Goal[] = [];
  let errorMessage: string | null = null;

  if (isConfigured) {
    // Catch *everything* — including a client that fails to construct because
    // of a malformed URL/key — so the page shows a diagnostic instead of a
    // white "Application error" screen.
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        errorMessage = error.message;
      } else {
        goals = (data as Goal[]) ?? [];
      }
    } catch (e) {
      errorMessage =
        e instanceof Error ? e.message : "Unknown error contacting Supabase.";
    }
  }

  return (
    <main>
      <h1>Accountability App</h1>
      <p className="subtitle">Track your goals and stay accountable.</p>

      {!isConfigured && (
        <div className="notice">
          <strong>Supabase not configured yet.</strong> Set{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. Locally, copy{" "}
          <code>.env.local.example</code> to <code>.env.local</code>; on Vercel,
          add them under Project Settings → Environment Variables and redeploy.
          See <code>README.md</code> for the full walkthrough.
        </div>
      )}

      {isConfigured && errorMessage && (
        <div className="notice">
          <strong>Couldn&apos;t load goals:</strong> {errorMessage}
          <br />
          Common fixes: run <code>supabase/schema.sql</code> to create the{" "}
          <code>goals</code> table and its RLS policy, and double-check your
          Supabase URL and anon key.
        </div>
      )}

      {isConfigured && !errorMessage && goals.length === 0 && (
        <div className="notice">
          Connected to Supabase, but no goals yet. Add a row to the{" "}
          <code>goals</code> table in the Supabase Table Editor to see it here.
        </div>
      )}

      {goals.map((goal) => (
        <div className="card" key={goal.id}>
          <h3>{goal.title}</h3>
          {goal.description && <p>{goal.description}</p>}
        </div>
      ))}
    </main>
  );
}
