// Instant skeleton shown while the board's data loads — makes navigation feel
// immediate instead of a frozen pause.
export default function Loading() {
  return (
    <main className="board" aria-busy="true">
      <header className="board-head">
        <div className="board-head-top">
          <div className="skel" style={{ width: "55%", height: 28 }} />
          <div className="skel" style={{ width: 84, height: 34, borderRadius: 999 }} />
        </div>
        <div className="skel" style={{ width: "40%", height: 14, marginTop: 12 }} />
      </header>

      <div className="roster-board">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skel-roster">
            <div className="skel skel-circle" />
            <div className="skel" style={{ width: 44, height: 10, marginTop: 8 }} />
          </div>
        ))}
      </div>

      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="skel" style={{ height: 190, marginBottom: 14 }} />
      ))}
    </main>
  );
}
