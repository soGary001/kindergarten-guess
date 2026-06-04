import { MemphisBackground } from "../components/MemphisBackground";
import { Mascot } from "../components/Mascot";

export function AttractScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="screen" style={{ display: "grid", placeItems: "center" }}>
      <MemphisBackground />
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <h1 style={{ color: "var(--pink)", fontSize: "3.5rem", margin: 0 }}>Guess the Animal!</h1>
        <p style={{ fontSize: "1.4rem", fontWeight: 700, opacity: 0.7, margin: "10px 0 0" }}>
          Describe animals in English — how many can Bibo guess in 60 seconds? ⏱
        </p>
        <div style={{ display: "grid", placeItems: "center", margin: "1.5rem 0" }}><Mascot state="idle" size={160} /></div>
        <button className="btn-pop" onClick={onStart}>Tap to start ✨</button>
      </div>
    </div>
  );
}
