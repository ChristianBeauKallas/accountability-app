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
  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let goals: Goal[] = [];
  let errorMessage: string | null = null;

  if (isConfigured) {
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
  }

  return (
    <main>
      <h1>Accountability App</h1>
      <p className="subtitle">Track your goals and stay accountable.</p>

      {!isConfigured && (
        <div className="notice">
          <strong>Supabase not configured yet.</strong> Copy{" "}
          <code>.env.local.example</code> to <code>.env.local</code> and add
          your Supabase URL and anon key, then restart the dev server. See{" "}
          <code>README.md</code> for the full walkthrough.
        </div>
      )}

      {isConfigured && errorMessage && (
        <div className="notice">
          <strong>Couldn&apos;t load goals:</strong> {errorMessage}
          <br />
          Make sure you&apos;ve created the <code>goals</code> table and its RLS
          policy (see <code>supabase/schema.sql</code>).
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
