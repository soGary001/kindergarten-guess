import { MemphisBackground } from "../components/MemphisBackground";
import { AnimalCard } from "../components/AnimalCard";
import { ANIMALS } from "../game/animals";
import type { Animal } from "../game/types";

export function PickScreen({ onPick }: { onPick: (a: Animal) => void }) {
  return (
    <div className="screen" style={{ display: "grid", placeItems: "center" }}>
      <MemphisBackground />
      <div style={{ zIndex: 1, textAlign: "center" }}>
        <h2 style={{ color: "var(--pink)" }}>Pick an animal to describe 🐾</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 16 }}>
          {ANIMALS.map((a) => <AnimalCard key={a.id} animal={a} onPick={onPick} />)}
        </div>
      </div>
    </div>
  );
}
