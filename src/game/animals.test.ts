import { expect, test } from "vitest";
import { ANIMALS, animalByName } from "./animals";

test("there are exactly 9 animals with unique names", () => {
  expect(ANIMALS).toHaveLength(9);
  expect(new Set(ANIMALS.map((a) => a.name)).size).toBe(9);
});

test("animalByName is case-insensitive and trims", () => {
  expect(animalByName("  Elephant ")?.name).toBe("Elephant");
  expect(animalByName("ELEPHANT")?.name).toBe("Elephant");
  expect(animalByName("dragon")).toBeUndefined();
});
