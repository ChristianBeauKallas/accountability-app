import { LogOut } from "lucide-react";

// Posts to the sign-out route handler (no client JS required).
export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post" className="mt-6">
      <button
        type="submit"
        className="inline-flex items-center gap-2 text-sm font-semibold text-warm-text"
      >
        <LogOut size={16} strokeWidth={2} aria-hidden />
        Sign out
      </button>
    </form>
  );
}
