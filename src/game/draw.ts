import type { Animal } from "./types";
import { ANIMALS } from "./animals";

/** Draw a random animal not yet drawn this game. Returns null when all 9 are used. */
export function drawAnimal(drawnIds: string[], rng: () => number = Math.random): Animal | null {
  const pool = ANIMALS.filter((a) => !drawnIds.includes(a.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

/** Guess sequence for a known target: 2 distinct wrong animals, then the target last. */
export function buildGuessPlan(target: Animal, rng: () => number = Math.random): Animal[] {
  const pool = ANIMALS.filter((a) => a.id !== target.id);
  const wrongs: Animal[] = [];
  while (wrongs.length < 2 && pool.length > 0) {
    wrongs.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return [...wrongs, target];
}
