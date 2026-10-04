import { requireProfile } from "@/lib/auth";
import { ScreenStub } from "@/components/ui/ScreenStub";

export default async function FitsPage() {
  const { profile } = await requireProfile("player");
  const first = profile.full_name?.split(" ")[0] || "there";
  return (
    <ScreenStub eyebrow={`Hey ${first}`} title="Your fits" phase="Phase 4" />
  );
}
