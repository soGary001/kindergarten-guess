export function ListeningOrb({ active, label }: { active: boolean; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 96, height: 96, borderRadius: "50%", background: "var(--coral)", border: "var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40,
        animation: active ? "pulse-ring 1.2s ease-out infinite" : "none",
      }}>🎤</div>
      <div style={{ fontWeight: 800 }}>{label}</div>
    </div>
  );
}
