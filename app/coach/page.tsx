import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "../avatar";

export const dynamic = "force-dynamic";

export default async function CoachHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rels } = await supabase
    .from("coaching_relationships")
    .select("client_id")
    .eq("coach_id", user.id);

  const clientIds = (rels ?? []).map((r) => r.client_id as string);
  const clients: { id: string; name: string; avatar: string | null }[] = [];
  if (clientIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", clientIds);
    for (const p of profs ?? [])
      clients.push({
        id: p.id,
        name: p.display_name ?? "Client",
        avatar: p.avatar_url ?? null,
      });
  }

  return (
    <main className="board">
      <header className="board-head">
        <div className="board-head-top">
          <div>
            <h1>Coaching</h1>
            <p className="subtitle">
              <Link href="/">‹ Feed</Link>
            </p>
          </div>
          <Link className="head-icon" href="/activities" aria-label="Settings">
            ⚙
          </Link>
        </div>
      </header>

      <section className="panel">
        <h2>Your clients</h2>
        {clients.length === 0 && (
          <p className="empty">
            No clients yet. Add someone from Settings → Coaching.
          </p>
        )}
        {clients.map((c) => (
          <Link key={c.id} href={`/coach/${c.id}`} className="client-row">
            <Avatar name={c.name} url={c.avatar} />
            <span className="client-name">{c.name}</span>
            <span className="client-go">›</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
