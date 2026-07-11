"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function GroupNameEditor({
  groupId,
  initial,
}: {
  groupId: string;
  initial: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === initial) return;
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("groups")
      .update({ name: trimmed })
      .eq("id", groupId);
    if (error) setError(error.message);
    else {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="group-name-editor">
      <label htmlFor="groupName">Group name</label>
      <div className="group-name-row">
        <input
          id="groupName"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          onBlur={save}
        />
        {saved && <span className="saved-tick">saved ✓</span>}
      </div>
      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}
