import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The currently-deployed build id. VersionWatch polls this and reloads the app
// when it no longer matches the id the page was built with — so an installed
// PWA that froze on an old version refreshes itself after a new deploy.
export async function GET() {
  const v = process.env.VERCEL_GIT_COMMIT_SHA || "dev";
  return NextResponse.json(
    { v },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
