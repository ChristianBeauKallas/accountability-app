import { requireProfile } from "@/lib/auth";
import { ScreenStub } from "@/components/ui/ScreenStub";
import { SignOutButton } from "@/components/SignOutButton";

export default async function PlayerProfilePage() {
  const { profile } = await requireProfile("player");
  return (
    <ScreenStub eyebrow={profile.full_name} title="Profile" phase="Phase 4">
      <SignOutButton />
    </ScreenStub>
  );
}
