import { MemphisBackground } from "../components/MemphisBackground";
import { Mascot, type MascotState } from "../components/Mascot";
import { SpeechBubble } from "../components/SpeechBubble";
import { ListeningOrb } from "../components/ListeningOrb";
import type { Animal } from "../game/types";

export function PlayScreen(props: {
  target: Animal;
  mascot: MascotState;
  aiLine: string | null;     // current Bibo guess/line
  kidLine: string | null;    // last transcript
  orbActive: boolean;
  orbLabel: string;
}) {
  const { target, mascot, aiLine, kidLine, orbActive, orbLabel } = props;
  return (
    <div className="screen">
      <MemphisBackground />
      <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", textAlign: "center", zIndex: 1 }}>
        <div style={{ fontWeight: 800, opacity: .6, fontSize: 12, letterSpacing: 1 }}>DESCRIBING</div>
        <img src={`/animals/${target.id}.png`} alt={target.name}
             style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 16, border: "3px solid var(--ink)", boxShadow: "3px 3px 0 var(--ink)" }}
             onError={(e) => { const d = document.createElement("div"); d.textContent = target.emoji; d.style.fontSize = "48px"; e.currentTarget.replaceWith(d); }} />
      </div>
      <div style={{ position: "absolute", top: 150, left: 40, display: "flex", gap: 24, alignItems: "flex-start", zIndex: 1 }}>
        <Mascot state={mascot} />
        {aiLine && <div style={{ marginTop: 12 }}><div style={{ fontWeight: 800, opacity: .6, fontSize: 12 }}>BIBO GUESSES</div><SpeechBubble who="ai">{aiLine}</SpeechBubble></div>}
      </div>
      {kidLine && (
        <div style={{ position: "absolute", top: 300, left: 24, zIndex: 1 }}>
          <div style={{ fontWeight: 800, opacity: .6, fontSize: 12 }}>YOU SAID</div>
          <SpeechBubble who="kid">{kidLine}</SpeechBubble>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, display: "grid", placeItems: "center", zIndex: 1 }}>
        <ListeningOrb active={orbActive} label={orbLabel} />
      </div>
    </div>
  );
}
