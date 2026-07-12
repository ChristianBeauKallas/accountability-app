// Picks the VAPID "subject" (the JWT `sub` claim) for a push request.
//
// Apple's push service commonly rejects a `mailto:` subject with a 403
// BadJwtToken and only reliably accepts an `https://` subject. So we prefer an
// https VAPID_SUBJECT if set; otherwise we derive one from the request host
// (your own domain), which Apple always accepts. A mailto env value is only
// used as a last resort when no host is available.
export function vapidSubject(req: Request): string {
  const env = (process.env.VAPID_SUBJECT || "").trim();
  if (env.startsWith("https://")) return env;
  const host = req.headers.get("host");
  if (host) return `https://${host}`;
  return env || "mailto:notifications@getbetterapp.com";
}
