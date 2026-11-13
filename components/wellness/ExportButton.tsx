"use client";

type Row = { name: string; days: number; qualified: boolean };

export function ExportButton({
  rows,
  goal,
  bonusLabel,
  month,
}: {
  rows: Row[];
  goal: number;
  bonusLabel: string;
  month: string;
}) {
  function download() {
    const header = ["Member", "Qualifying days", `Goal (${goal})`, "Qualified", "Payout"];
    const body = rows.map((r) => [
      r.name,
      String(r.days),
      String(goal),
      r.qualified ? "Yes" : "No",
      r.qualified ? bonusLabel : "$0",
    ]);
    const csv = [header, ...body]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wellness-${month.toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="rounded-btn border border-border bg-surface px-2.5 py-[7px] text-sm font-semibold text-ink"
    >
      Export
    </button>
  );
}
