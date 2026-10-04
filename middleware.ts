import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // all paths except static assets, image optimizer, icons, and manifest
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.png$|manifest.webmanifest).*)",
  ],
};
