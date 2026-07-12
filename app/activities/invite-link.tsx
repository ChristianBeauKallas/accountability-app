"use client";

import { useEffect, useState } from "react";

export default function InviteLink({
  code,
  groupName,
}: {
  code: string;
  groupName: string;
}) {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLink(`${window.location.origin}/join/${code}`);
  }, [code]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  }

  async function share() {
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (nav.share) {
      try {
        await nav.share({
          title: `Join ${groupName} on Get Better`,
          text: `Join "${groupName}" on Get Better:`,
          url: link,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  }

  return (
    <div className="invite-content">
      <p className="invite-hint">
        Anyone with this link can join {groupName}. Share it with your crew.
      </p>
      <div className="invite-row">
        <input
          className="invite-input"
          value={link}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Invite link"
        />
        <button className="invite-copy" onClick={copy}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <button className="invite-share" onClick={share}>
        Share invite
      </button>
      <p className="invite-code">
        Or share the code: <code>{code}</code>
      </p>
    </div>
  );
}
