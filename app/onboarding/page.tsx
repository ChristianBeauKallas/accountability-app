import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/welcome");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, onboarded")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/welcome");
  if (profile.onboarded) redirect("/");

  return (
    <OnboardingFlow
      userId={user.id}
      role={profile.role}
      initialName={profile.full_name ?? ""}
    />
  );
}
