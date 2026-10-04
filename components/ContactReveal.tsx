"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Contact = { name?: string; role?: string; email: string | null; phone: string | null };

function ContactLines({ email, phone }: { email: string | null; phone: string | null }) {
  if (!email && !phone) {
    return (
      <p className="text-sm text-muted-2">Hasn&rsquo;t added contact info yet.</p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {email && (
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-2 text-sm font-semibold text-accent"
        >
          <Mail size={15} strokeWidth={2} aria-hidden />
          <span className="truncate">{email}</span>
        </a>
      )}
      {phone && (
        <a
          href={`tel:${phone}`}
          className="flex items-center gap-2 text-sm font-semibold text-accent"
        >
          <Phone size={15} strokeWidth={2} aria-hidden />
          {phone}
        </a>
      )}
    </div>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-gold/40 bg-warm-soft/40 p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Lock size={13} strokeWidth={2.5} className="text-warm-text" aria-hidden />
        <span className="text-[11px] font-bold uppercase tracking-eyebrow text-warm-text">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

/** Coach-facing: a matched player's contact (RLS only returns it on a mutual match). */
export function PlayerContactCard({ playerId }: { playerId: string }) {
  const [state, setState] = useState<"loading" | Contact | null>("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("contact_info")
        .select("email, phone")
        .eq("user_id", playerId)
        .maybeSingle();
      if (active) setState(data ?? { email: null, phone: null });
    })();
    return () => {
      active = false;
    };
  }, [playerId]);

  if (state === "loading") return null;

  return (
    <Shell title="Mutual match — contact unlocked">
      <ContactLines email={state?.email ?? null} phone={state?.phone ?? null} />
    </Shell>
  );
}

/** Player-facing: contacts for the coaches on a program you've matched with. */
export function ProgramContactCard({ programId }: { programId: string }) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data: staff } = await supabase
        .from("program_staff")
        .select("profile_id, staff_role, profile:profiles(full_name)")
        .eq("program_id", programId);

      const rows = (staff ?? []) as unknown as {
        profile_id: string;
        staff_role: string;
        profile: { full_name: string } | null;
      }[];
      const ids = rows.map((r) => r.profile_id);

      let info: { user_id: string; email: string | null; phone: string | null }[] =
        [];
      if (ids.length) {
        const { data } = await supabase
          .from("contact_info")
          .select("user_id, email, phone")
          .in("user_id", ids);
        info = data ?? [];
      }

      const merged: Contact[] = info
        .map((c) => {
          const s = rows.find((r) => r.profile_id === c.user_id);
          return {
            name: s?.profile?.full_name,
            role: s?.staff_role,
            email: c.email,
            phone: c.phone,
          };
        })
        .filter((c) => c.email || c.phone);

      if (active) setContacts(merged);
    })();
    return () => {
      active = false;
    };
  }, [programId]);

  if (contacts === null) return null;

  return (
    <Shell title="Mutual match — contact unlocked">
      {contacts.length === 0 ? (
        <p className="text-sm text-muted-2">
          The coach hasn&rsquo;t added contact info yet — check back soon.
        </p>
      ) : (
        <ul className="space-y-3">
          {contacts.map((c, i) => (
            <li key={i}>
              {c.name && (
                <p className="text-sm font-semibold text-ink">
                  {c.name}
                  {c.role && (
                    <span className="font-normal text-muted-2">
                      {" "}
                      · {ROLE_LABEL[c.role] ?? c.role}
                    </span>
                  )}
                </p>
              )}
              <div className="mt-1">
                <ContactLines email={c.email} phone={c.phone} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

const ROLE_LABEL: Record<string, string> = {
  head: "Head coach",
  assistant: "Assistant coach",
  recruiting_coordinator: "Recruiting coordinator",
};
