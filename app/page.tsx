import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Entry router: sends people to welcome, onboarding, or their role home.
export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/welcome");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarded")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/welcome");
  if (!profile.onboarded) redirect("/onboarding");

  redirect(profile.role === "coach" ? "/inbox" : "/fits");
}
