import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// Server component: shows a bell with an unread badge, linking to /notifications.
export async function NotificationsBell() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  const unread = count ?? 0;

  return (
    <Link
      href="/notifications"
      aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      className="relative -mr-1 flex h-9 w-9 items-center justify-center rounded-pill text-ink hover:bg-chip"
    >
      <Bell size={20} strokeWidth={2} aria-hidden />
      {unread > 0 && (
        <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-pill bg-accent px-1 text-[10px] font-bold text-surface">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
