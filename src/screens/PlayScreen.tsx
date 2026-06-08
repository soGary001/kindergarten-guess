import { useEffect, useRef } from "react";
import { MemphisBackground } from "../components/MemphisBackground";
import { Mascot, type MascotState } from "../components/Mascot";
import { ListeningOrb } from "../components/ListeningOrb";
import type { Animal } from "../game/types";

export type Msg = { who: "ai" | "kid"; text: string };

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function PlayScreen(props: {
  mascot: MascotState;
  messages: Msg[];
  score: number;
  secondsLeft: number;
  reveal: Animal | null;
  onQuit: () => void;
  orbActive: boolean;
  orbLabel: string;
}) {
  const { mascot, messages, score, secondsLeft, reveal, onQuit, orbActive, orbLabel } = props;
  const endRef = useRef<HTMLDivElement>(null);
  const low = secondsLeft <= 10;

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const pill = (bg: string): React.CSSProperties => ({
    background: bg, color: "#fff", border: "4px solid var(--ink)", borderRadius: 999,
    boxShadow: "4px 4px 0 var(--ink)", padding: "8px 20px", fontWeight: 900, fontSize: "1.6rem",
  });

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <MemphisBackground />

      {/* HUD: home + score (left), mascot (center), countdown (right) */}
      <div style={{ zIndex: 2, width: "min(960px, 94vw)", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onQuit}
            aria-label="Back to home"
            title="Back to home"
            style={{
              width: 58, height: 58, borderRadius: "50%", background: "var(--yellow)",
              border: "4px solid var(--ink)", boxShadow: "4px 4px 0 var(--ink)", cursor: "pointer",
              fontSize: 28, lineHeight: 1, display: "grid", placeItems: "center", padding: 0,
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "translate(3px,3px)"; e.currentTarget.style.boxShadow = "1px 1px 0 var(--ink)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "4px 4px 0 var(--ink)"; }}
          >
            🏠
          </button>
          <div style={pill("var(--pink)")}>⭐ {score}</div>
        </div>
        <Mascot state={mascot} size={72} />
        <div style={{ ...pill(low ? "var(--coral)" : "var(--sky)"), color: low ? "#fff" : "#063", animation: low ? "float .5s ease-in-out infinite" : undefined }}>
          ⏱ {fmt(secondsLeft)}
        </div>
      </div>

      {/* Center: the full conversation, enlarged for projection */}
      <div
        style={{
          zIndex: 1, flex: 1, width: "min(900px, 92vw)", margin: "0 auto", overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 18,
          justifyContent: messages.length ? "flex-start" : "center", padding: "20px 0",
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: "center", fontSize: "1.8rem", fontWeight: 800, opacity: 0.6 }}>
            Describe an animal — Bibo will guess! 🐾
          </div>
        )}
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

      {/* Correct! Reveal the animal image over everything for a beat. */}
      {reveal && (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, display: "grid", placeItems: "center", background: "rgba(253,231,240,.92)" }}>
          <div style={{ textAlign: "center", animation: "pop-in .35s ease-out" }}>
            <img
              src={`/animals/${reveal.id}.png`}
              alt={reveal.name}
              style={{ width: "min(360px, 60vh)", height: "min(360px, 60vh)", objectFit: "cover", borderRadius: 28, border: "5px solid var(--ink)", boxShadow: "8px 8px 0 var(--ink)" }}
              onError={(e) => { const d = document.createElement("div"); d.textContent = reveal.emoji; d.style.fontSize = "200px"; e.currentTarget.replaceWith(d); }}
            />
            <div style={{ fontSize: "2.6rem", fontWeight: 900, color: "var(--pink)", marginTop: 16 }}>
              Yes! It's {/^[aeiou]/i.test(reveal.name) ? "an" : "a"} {reveal.name}! {reveal.emoji}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
