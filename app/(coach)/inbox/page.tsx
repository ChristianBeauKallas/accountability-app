import { requireProfile } from "@/lib/auth";
import { ScreenStub } from "@/components/ui/ScreenStub";

export default async function InboxPage() {
  const { profile } = await requireProfile("coach");
  const first = profile.full_name?.split(" ")[0] || "Coach";
  return (
    <ScreenStub eyebrow={`Hey ${first}`} title="Inbox" phase="Phase 5" />
  );
}
