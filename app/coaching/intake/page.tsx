import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import IntakeWizard from "./intake-wizard";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rels } = await supabase
    .from("coaching_relationships")
    .select("id")
    .eq("client_id", user.id)
    .limit(1);
  const rel = rels?.[0] as { id: string } | undefined;

  if (!rel) {
    return (
      <main className="board">
        <header className="board-head">
          <div className="board-head-top">
            <div>
              <h1>Your plan</h1>
              <p className="subtitle">
                <Link href="/">‹ Feed</Link>
              </p>
            </div>
          </div>
        </header>
        <div className="notice">
          You&apos;re not in a coaching program yet.
        </div>
      </main>
    );
  }

  return <IntakeWizard relationshipId={rel.id} userId={user.id} />;
}
