const SHAPES = [
  { type: "circle",   top: "8%",  left: "6%",  color: "var(--yellow)",   size: 44 },
  { type: "triangle", top: "14%", left: "88%", color: "var(--sky)",      size: 36 },
  { type: "square",   top: "70%", left: "4%",  color: "var(--lavender)", size: 30 },
  { type: "circle",   top: "80%", left: "92%", color: "var(--mint)",     size: 26 },
  { type: "zigzag",   top: "55%", left: "90%", color: "var(--coral)",    size: 40 },
  { type: "dot",      top: "40%", left: "12%", color: "var(--pink)",     size: 16 },
];

export function MemphisBackground() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {SHAPES.map((s, i) => {
        const base = { position: "absolute" as const, top: s.top, left: s.left, animation: `float ${3 + (i % 3)}s ease-in-out infinite` };
        if (s.type === "circle" || s.type === "dot")
          return <div key={i} style={{ ...base, width: s.size, height: s.size, borderRadius: "50%", background: s.color }} />;
        if (s.type === "square")
          return <div key={i} style={{ ...base, width: s.size, height: s.size, background: s.color, transform: "rotate(18deg)" }} />;
        if (s.type === "triangle")
          return <div key={i} style={{ ...base, width: 0, height: 0, borderLeft: `${s.size/2}px solid transparent`, borderRight: `${s.size/2}px solid transparent`, borderBottom: `${s.size}px solid ${s.color}` }} />;
        // zigzag
        return <div key={i} style={{ ...base, width: s.size, height: s.size*0.4, color: s.color,
          background: "repeating-linear-gradient(135deg, currentColor 0 3px, transparent 3px 8px)" }} />;
      })}
    </div>
  );
}
