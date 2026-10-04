import { requireProfile } from "@/lib/auth";
import { ScreenStub } from "@/components/ui/ScreenStub";
import { SignOutButton } from "@/components/SignOutButton";

export default async function ProgramPage() {
  const { profile } = await requireProfile("coach");
  return (
    <ScreenStub eyebrow={profile.full_name} title="Program" phase="Phase 5">
      <SignOutButton />
    </ScreenStub>
  );
}
