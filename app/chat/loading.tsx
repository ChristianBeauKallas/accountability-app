// Skeleton while the chat loads.
export default function Loading() {
  const widths = ["55%", "40%", "70%", "35%", "60%"];
  return (
    <main className="board" aria-busy="true">
      <header className="board-head">
        <div className="skel" style={{ width: "35%", height: 28 }} />
        <div className="skel" style={{ width: "50%", height: 14, marginTop: 12 }} />
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
        {widths.map((w, i) => (
          <div
            key={i}
            className="skel"
            style={{
              width: w,
              height: 40,
              borderRadius: 16,
              alignSelf: i % 2 ? "flex-end" : "flex-start",
            }}
          />
        ))}
      </div>
    </main>
  );
}
