import { MemphisBackground } from "../components/MemphisBackground";
import type { Animal } from "../game/types";

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function DrawScreen(props: {
  animal: Animal | null;
  score: number;
  secondsLeft: number;
  onGo: () => void;
  onQuit: () => void;
}) {
  const { animal, score, secondsLeft, onGo, onQuit } = props;

  const pill = (bg: string, color = "#fff"): React.CSSProperties => ({
    background: bg, color, border: "4px solid var(--ink)", borderRadius: 999,
    boxShadow: "4px 4px 0 var(--ink)", padding: "8px 20px", fontWeight: 900, fontSize: "1.6rem",
  });

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <MemphisBackground />

      {/* HUD: home + score (left), paused timer (right) */}
      <div style={{ zIndex: 2, width: "min(960px, 94vw)", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onQuit}
            aria-label="Back to home"
            title="Back to home"
            style={{ width: 58, height: 58, borderRadius: "50%", background: "var(--yellow)", border: "4px solid var(--ink)", boxShadow: "4px 4px 0 var(--ink)", cursor: "pointer", fontSize: 28, lineHeight: 1, display: "grid", placeItems: "center", padding: 0 }}
          >
            🏠
          </button>
          <div style={pill("var(--pink)")}>⭐ {score}</div>
        </div>
        <div style={pill("var(--sky)", "#063")}>⏱ {fmt(secondsLeft)}</div>
      </div>

      {/* Center: the drawn animal + start button */}
      <div style={{ zIndex: 1, flex: 1, display: "grid", placeItems: "center", width: "100%" }}>
        {!animal ? (
          <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "var(--pink)" }}>Drawing a card… 🎲</div>
        ) : (
          <div style={{ textAlign: "center", animation: "pop-in .35s ease-out" }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, opacity: 0.6, letterSpacing: 1 }}>YOU DREW</div>
            <img
              src={`/animals/${animal.id}.png`}
              alt={animal.name}
              style={{ width: "min(320px, 52vh)", height: "min(320px, 52vh)", objectFit: "cover", borderRadius: 28, border: "5px solid var(--ink)", boxShadow: "8px 8px 0 var(--ink)", margin: "10px 0" }}
              onError={(e) => { const d = document.createElement("div"); d.textContent = animal.emoji; d.style.fontSize = "180px"; e.currentTarget.replaceWith(d); }}
            />
            <div style={{ fontSize: "2.6rem", fontWeight: 900, color: "var(--pink)" }}>{animal.emoji} {animal.name}</div>
            <button className="btn-pop" style={{ marginTop: 22 }} onClick={onGo}>Start describing! 🎤</button>
            <div style={{ marginTop: 10, fontWeight: 700, opacity: 0.55 }}>(the timer starts when you tap)</div>
          </div>
        )}
      </div>
    </div>
  );
}
