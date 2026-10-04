import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

// Loads the signed-in user's profile, enforcing auth, completed onboarding,
// and (optionally) the expected role. Redirects otherwise.
export async function requireProfile(expected?: UserRole): Promise<{
  profile: Profile;
  userId: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/welcome");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/welcome");
  if (!profile.onboarded) redirect("/onboarding");
  if (expected && profile.role !== expected) redirect("/");

  return { profile: profile as Profile, userId: user.id };
}
