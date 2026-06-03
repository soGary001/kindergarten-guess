import type { ReactNode } from "react";

export function SpeechBubble({ who, children }: { who: "ai" | "kid"; children: ReactNode }) {
  return <div className={`bubble ${who}`} style={{ animation: "pop-in .25s ease-out", maxWidth: 520 }}>{children}</div>;
}
