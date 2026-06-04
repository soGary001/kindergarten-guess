import { expect, test } from "vitest";
import { planGuessSequence } from "./guessing";
import { animalByName } from "./animals";

const target = animalByName("Elephant")!;

test("plan ends with the correct animal", () => {
  const seq = planGuessSequence(target, () => 0);
  expect(seq[seq.length - 1].id).toBe("elephant");
});

test("plan has 2 or 3 wrong guesses before the correct one", () => {
  const seq = planGuessSequence(target, () => 0);
  const wrongCount = seq.length - 1;
  expect(wrongCount).toBeGreaterThanOrEqual(2);
  expect(wrongCount).toBeLessThanOrEqual(3);
});

test("wrong guesses are never the target and never repeat", () => {
  const seq = planGuessSequence(target, () => 0.99);
  const wrongs = seq.slice(0, -1);
  expect(wrongs.every((a) => a.id !== "elephant")).toBe(true);
  expect(new Set(wrongs.map((a) => a.id)).size).toBe(wrongs.length);
});

test("rng controls the number of wrong guesses (2 wrong -> len 3, 3 wrong -> len 4)", () => {
  expect(planGuessSequence(target, () => 0.1)).toHaveLength(3);
  expect(planGuessSequence(target, () => 0.9)).toHaveLength(4);
});
