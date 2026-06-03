import type { Animal } from "../game/types";

export function AnimalCard({ animal, onPick }: { animal: Animal; onPick: (a: Animal) => void }) {
  return (
    <button onClick={() => onPick(animal)} style={{
      border: "var(--border)", borderRadius: "var(--radius)", background: "#fff",
      boxShadow: "var(--shadow-hard)", padding: 0, cursor: "pointer", overflow: "hidden",
    }}>
      <img src={`/animals/${animal.id}.png`} alt={animal.name}
           style={{ width: 180, height: 140, objectFit: "cover", display: "block" }}
           onError={(e) => { (e.currentTarget.style.display = "none"); }} />
      <div style={{ fontWeight: 800, fontSize: 22, padding: "8px 0" }}>{animal.emoji} {animal.name}</div>
    </button>
  );
}
