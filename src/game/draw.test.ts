import { expect, test } from "vitest";
import { drawAnimal, buildGuessPlan } from "./draw";
import { ANIMALS } from "./animals";

test("drawAnimal never repeats a drawn animal", () => {
  const drawn = ["elephant", "snake", "tiger"];
  const a = drawAnimal(drawn, () => 0);
  expect(a).not.toBeNull();
  expect(drawn).not.toContain(a!.id);
});

test("drawAnimal returns null when all 9 are used", () => {
  expect(drawAnimal(ANIMALS.map((a) => a.id))).toBeNull();
});

test("buildGuessPlan: 2 distinct wrong guesses then the target last", () => {
  const target = ANIMALS.find((a) => a.id === "elephant")!;
  const plan = buildGuessPlan(target, () => 0.99);
  expect(plan).toHaveLength(3);
  expect(plan[2].id).toBe("elephant");
  const wrongs = plan.slice(0, 2);
  expect(wrongs.every((a) => a.id !== "elephant")).toBe(true);
  expect(new Set(wrongs.map((a) => a.id)).size).toBe(2);
});
