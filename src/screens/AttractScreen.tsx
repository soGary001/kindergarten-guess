import { MemphisBackground } from "../components/MemphisBackground";
import { Mascot } from "../components/Mascot";

export function AttractScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="screen" style={{ display: "grid", placeItems: "center" }}>
      <MemphisBackground />
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <h1 style={{ color: "var(--pink)", fontSize: "3.5rem", margin: 0 }}>Guess the Animal!</h1>
        <div style={{ display: "grid", placeItems: "center", margin: "1.5rem 0" }}><Mascot state="idle" size={160} /></div>
        <button className="btn-pop" onClick={onStart}>Tap to start ✨</button>
      </div>
    </div>
  );
}
