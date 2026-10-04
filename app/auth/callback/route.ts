import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

// Handles the magic-link / OAuth redirect: exchanges the code for a session,
// reconciles the chosen role (from the pre-auth cookie) onto a fresh profile,
// then sends the user into the app router at `/`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const roleCookie = cookies().get("athletx_role")?.value as
      | UserRole
      | undefined;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarded")
      .eq("id", user.id)
      .single();

    // A brand-new OAuth user defaults to 'player'; honor the role they picked
    // on the welcome screen as long as they haven't finished onboarding.
    if (
      profile &&
      !profile.onboarded &&
      (roleCookie === "player" || roleCookie === "coach") &&
      profile.role !== roleCookie
    ) {
      await supabase
        .from("profiles")
        .update({ role: roleCookie })
        .eq("id", user.id);
      if (roleCookie === "player") {
        await supabase.from("players").upsert({ id: user.id });
      }
    }
  }

  cookies().delete("athletx_role");
  return NextResponse.redirect(`${origin}${next}`);
}
