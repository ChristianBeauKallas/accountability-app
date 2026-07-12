// Per-account onboarding flags. Each contextual walkthrough is shown once and
// then remembered in localStorage; the Welcome tour additionally persists to
// profiles.onboarded_at so it sticks across devices. Kept in one place so the
// board, the tours, and the Settings "replay" control all agree on the keys.

export type TourKey = "tour" | "posting" | "profile" | "chat";

export function flagKey(key: TourKey, userId: string): string {
  return `gb_${key}_done_${userId}`;
}

export function tourDone(key: TourKey, userId: string): boolean {
  try {
    return !!localStorage.getItem(flagKey(key, userId));
  } catch {
    return false;
  }
}

export function markTourDone(key: TourKey, userId: string): void {
  try {
    localStorage.setItem(flagKey(key, userId), "1");
  } catch {
    /* storage blocked — nothing we can do */
  }
}

// The install nudge is a single global flag (it's about the device, not the
// account), set once the "Add to home screen" pop-up is dismissed.
export const INSTALL_SEEN_KEY = "gb_install_seen";

export function installSeen(): boolean {
  try {
    return !!localStorage.getItem(INSTALL_SEEN_KEY);
  } catch {
    return false;
  }
}

// Reset every contextual walkthrough so they replay as the user revisits each
// screen. Used by the Settings "See the walkthroughs again" control.
export function resetTours(userId: string): void {
  try {
    for (const k of ["tour", "posting", "profile", "chat"] as TourKey[])
      localStorage.removeItem(flagKey(k, userId));
  } catch {
    /* ignore */
  }
}
