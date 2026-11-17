import { redirect } from "next/navigation";
import { getViewer } from "@/lib/wellness-server";
import { Compose } from "./Compose";
import { AppTour } from "@/components/wellness/AppTour";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  return (
    <>
      <Compose
        programId={viewer.program.id}
        minsPerDay={viewer.program.mins_per_day}
      />
      <AppTour />
    </>
  );
}
