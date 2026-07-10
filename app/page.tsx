import { createClient } from "@/lib/supabase/server";
import Onboarding from "./onboarding";

export const dynamic = "force-dynamic";

export default async function Home() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return (
      <main>
        <h1>Accountability</h1>
        <div className="notice">
          <strong>Supabase not configured yet.</strong> Set{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then run{" "}
          <code>supabase/schema.sql</code> in the SQL editor.
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware guarantees a signed-in user here, but guard anyway.
  if (!user) return null;

  // Which group(s) is this person in?
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, role, groups(name, invite_code)")
    .eq("user_id", user.id);

  const membership = memberships?.[0] as
    | { role: string; groups: { name: string; invite_code: string } }
    | undefined;

  if (!membership) {
    return (
      <main>
        <h1>Welcome 👋</h1>
        <p className="subtitle">
          Start a group for your crew, or join one with an invite code.
        </p>
        <Onboarding />
        <SignOut />
      </main>
    );
  }

  // Foundation placeholder — Step 2 replaces this with the Home board.
  return (
    <main>
      <h1>{membership.groups.name}</h1>
      <p className="subtitle">You&apos;re in. The board lands here next.</p>
      <div className="notice">
        You joined as <strong>{membership.role}</strong>. Invite others with
        code <code>{membership.groups.invite_code}</code>.
      </div>
      <SignOut />
    </main>
  );
}

function SignOut() {
  return (
    <form action="/auth/signout" method="post" className="signout">
      <button type="submit">Sign out</button>
    </form>
  );
}
