import { useEffect } from "react";
import confetti from "canvas-confetti";
import type { Animal } from "../game/types";

export function CelebrationScreen({ animal, onDone }: { animal: Animal; onDone: () => void }) {
  useEffect(() => {
    confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
    const t = setTimeout(onDone, 6000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="screen" onClick={onDone} style={{ display: "grid", placeItems: "center", background: "var(--mint)" }}>
      <div style={{ textAlign: "center", animation: "pop-in .4s ease-out" }}>
        <img src={`/animals/${animal.id}.png`} alt={animal.name}
             style={{ width: 360, borderRadius: 24, border: "var(--border)", boxShadow: "var(--shadow-hard)" }}
             onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement("div"), { textContent: animal.emoji, style: "font-size:200px" })); }} />
        <h1 style={{ color: "var(--pink)", fontSize: "3rem" }}>Yes! It's a {animal.name}! 🎉</h1>
      </div>
    </div>
  );
}
