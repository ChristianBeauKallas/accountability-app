import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NotificationsList } from "@/components/NotificationsList";
import { HeaderActions } from "@/components/HeaderActions";
import type { Notification } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { userId } = await requireProfile("player");
  const supabase = createClient();

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as Notification[];

  return (
    <main className="px-5 pt-12">
      <div className="flex items-start justify-between">
        <p className="eyebrow">Activity</p>
        <HeaderActions />
      </div>
      <h1 className="mt-1 mb-5 text-3xl font-display font-bold tracking-tight">
        Notifications
      </h1>
      <NotificationsList userId={userId} initial={notifications} />
    </main>
  );
}
