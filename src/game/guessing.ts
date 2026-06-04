import type { Animal } from "./types";
import { ANIMALS } from "./animals";

/** rng() must return a float in [0, 1). Inject Math.random in production. */
export function planGuessSequence(
  target: Animal,
  rng: () => number = Math.random,
): Animal[] {
  // 2 or 3 wrong guesses, so the AI lands the answer on roughly the 3rd–4th round.
  const wrongCount = rng() < 0.5 ? 2 : 3;
  const pool = ANIMALS.filter((a) => a.id !== target.id);

  const wrongs: Animal[] = [];
  while (wrongs.length < wrongCount && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    wrongs.push(pool.splice(idx, 1)[0]);
  }
  return [...wrongs, target];
}
