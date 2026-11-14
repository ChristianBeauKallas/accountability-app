import { redirect } from "next/navigation";
import { getViewer } from "@/lib/wellness-server";
import { Landing } from "@/components/wellness/Landing";

export const dynamic = "force-dynamic";

export default async function Home() {
  const viewer = await getViewer();
  if (viewer) redirect("/feed");
  return <Landing />;
}
