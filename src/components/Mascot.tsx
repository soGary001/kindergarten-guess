type MascotState = "idle" | "listening" | "thinking" | "talking" | "celebrating";
const FACE: Record<MascotState, string> = { idle: "🤖", listening: "👂", thinking: "🤔", talking: "🗣️", celebrating: "🥳" };

export function Mascot({ state, size = 120 }: { state: MascotState; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "var(--yellow)",
      border: "var(--border)", boxShadow: "var(--shadow-hard)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.5, animation: state === "talking" ? "float .5s ease-in-out infinite" : "float 3s ease-in-out infinite",
    }}>{FACE[state]}</div>
  );
}
export type { MascotState };
