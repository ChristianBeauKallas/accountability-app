import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PromptStudio, { type VideoPrompt } from "./prompt-studio";

export const dynamic = "force-dynamic";

export default async function PromptPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Owner-only — you must own a group. Others get a 404 (tab is hidden anyway).
  const { data: owned } = await supabase
    .from("groups")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!owned) notFound();

  const { data: prompts } = await supabase
    .from("video_prompts")
    .select("id, prompt, rating, recorded, difficulty, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(80);

  return (
    <main className="board">
      <header className="board-head">
        <div className="board-head-top">
          <div>
            <h1>Prompt</h1>
            <p className="subtitle">
              <Link href="/">‹ Feed</Link> · Post-workout, on camera
            </p>
          </div>
        </div>
      </header>

      <PromptStudio userId={user.id} initial={(prompts ?? []) as VideoPrompt[]} />
    </main>
  );
}
