import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/** Validate a Bearer token from an API request and return the user (or null). */
export async function verifyBearer(req: Request): Promise<User | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const {
    data: { user },
  } = await anon.auth.getUser(token);
  return user;
}
