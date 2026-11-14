import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exchanges an email-confirmation / magic-link code for a session, then sends
// the user into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
