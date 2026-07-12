// Skeleton while a profile loads.
export default function Loading() {
  return (
    <main className="board profile" aria-busy="true">
      <header className="board-head">
        <div className="board-head-top">
          <div className="skel" style={{ width: "40%", height: 28 }} />
          <div className="skel" style={{ width: 78, height: 30, borderRadius: 999 }} />
        </div>
        <div className="skel" style={{ width: "30%", height: 14, marginTop: 12 }} />
      </header>

      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "0.5rem 0 1.25rem" }}>
        <div className="skel skel-circle" style={{ width: 72, height: 72 }} />
        <div style={{ flex: 1 }}>
          <div className="skel" style={{ width: "50%", height: 18 }} />
          <div className="skel" style={{ width: "70%", height: 12, marginTop: 8 }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skel" style={{ height: 62 }} />
        ))}
      </div>

      <div className="skel" style={{ height: 170 }} />
    </main>
  );
}
