import { useEffect, useRef } from "react";
import { MemphisBackground } from "../components/MemphisBackground";
import { Mascot, type MascotState } from "../components/Mascot";
import { ListeningOrb } from "../components/ListeningOrb";
import type { Animal } from "../game/types";

export type Msg = { who: "ai" | "kid"; text: string };

export function PlayScreen(props: {
  target: Animal;
  mascot: MascotState;
  messages: Msg[];
  orbActive: boolean;
  orbLabel: string;
}) {
  const { target, mascot, messages, orbActive, orbLabel } = props;
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <MemphisBackground />

      {/* Top: which animal we're describing + the mascot */}
      <div style={{ zIndex: 1, display: "flex", alignItems: "center", gap: 18, paddingTop: 18 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 800, opacity: 0.55, fontSize: 12, letterSpacing: 1 }}>DESCRIBING</div>
          <img
            src={`/animals/${target.id}.png`}
            alt={target.name}
            style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 14, border: "3px solid var(--ink)", boxShadow: "3px 3px 0 var(--ink)" }}
            onError={(e) => { const d = document.createElement("div"); d.textContent = target.emoji; d.style.fontSize = "44px"; e.currentTarget.replaceWith(d); }}
          />
        </div>
        <Mascot state={mascot} size={88} />
      </div>

      {/* Center: the full conversation, enlarged for projection */}
      <div
        style={{
          zIndex: 1,
          flex: 1,
          width: "min(900px, 92vw)",
          margin: "0 auto",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          justifyContent: messages.length ? "flex-start" : "center",
          padding: "20px 0",
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.who === "ai" ? "flex-start" : "flex-end" }}>
            <div
              className={`bubble ${m.who}`}
              style={{ fontSize: "2rem", lineHeight: 1.25, padding: "18px 26px", maxWidth: "85%", borderRadius: 28, boxShadow: "5px 5px 0 var(--ink)" }}
            >
              <span style={{ display: "block", fontSize: "0.8rem", fontWeight: 800, opacity: 0.55, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                {m.who === "ai" ? "Bibo" : "You"}
              </span>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Bottom: listening / status orb */}
      <div style={{ zIndex: 1, paddingBottom: 22 }}>
        <ListeningOrb active={orbActive} label={orbLabel} />
      </div>
    </div>
  );
}
