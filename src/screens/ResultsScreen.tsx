import { useEffect } from "react";
import confetti from "canvas-confetti";
import { MemphisBackground } from "../components/MemphisBackground";

export function ResultsScreen({ score, onDone }: { score: number; onDone: () => void }) {
  useEffect(() => {
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 } });
  }, []);

  const noun = score === 1 ? "animal" : "animals";

  return (
    <div
      className="screen"
      onClick={onDone}
      style={{ display: "grid", placeItems: "center", background: "var(--mint)", cursor: "pointer" }}
    >
      <MemphisBackground />
      <div style={{ textAlign: "center", zIndex: 1, animation: "pop-in .4s ease-out" }}>
        <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--ink)" }}>Time's up! ⏱</div>
        <div style={{ fontSize: "8rem", fontWeight: 900, color: "var(--pink)", lineHeight: 1.1 }}>{score}</div>
        <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--ink)" }}>
          Bibo guessed {score} {noun}! 🎉
        </div>
        <button className="btn-pop" style={{ marginTop: 28 }} onClick={onDone}>
          Tap to play again ✨
        </button>
      </div>
    </div>
  );
}
