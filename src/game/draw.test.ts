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

test("buildGuessPlan: 1 wrong guess then the target last", () => {
  const target = ANIMALS.find((a) => a.id === "elephant")!;
  const plan = buildGuessPlan(target, () => 0.99);
  expect(plan).toHaveLength(2);
  expect(plan[1].id).toBe("elephant");
  expect(plan[0].id).not.toBe("elephant");
});
