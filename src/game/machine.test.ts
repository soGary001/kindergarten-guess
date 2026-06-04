import { expect, test } from "vitest";
import { initialState, reduce } from "./machine";
import { animalByName } from "./animals";

const elephant = animalByName("Elephant")!;
const snake = animalByName("Snake")!;

test("starts in attract", () => {
  expect(initialState().phase).toBe("attract");
});

test("START begins a round in describing with a fresh score", () => {
  const s = reduce(initialState(), { type: "START" });
  expect(s.phase).toBe("describing");
  expect(s.score).toBe(0);
  expect(s.description).toBe("");
});

test("happy round: describe -> guess -> confirm -> reveal (score++) -> next clears the round", () => {
  let s = reduce(initialState(), { type: "START" });

  s = reduce(s, { type: "DESCRIBED", text: "It's big. It has a long nose." });
  expect(s.phase).toBe("thinking");
  expect(s.description).toContain("long nose");

  s = reduce(s, { type: "GUESS", animal: elephant });
  expect(s.phase).toBe("guessing");
  expect(s.guess?.id).toBe("elephant");
  expect(s.guessedIds).toEqual(["elephant"]);

  s = reduce(s, { type: "GUESS_SPOKEN" });
  expect(s.phase).toBe("awaiting");

  s = reduce(s, { type: "CORRECT" });
  expect(s.phase).toBe("revealing"); // show the animal image first
  expect(s.score).toBe(1);
  expect(s.guess?.id).toBe("elephant"); // kept so the reveal can show it

  s = reduce(s, { type: "NEXT" });
  expect(s.phase).toBe("describing"); // fresh conversation for the next animal
  expect(s.description).toBe("");
  expect(s.guess).toBeNull();
  expect(s.guessedIds).toEqual([]);
});

test("wrong guess: RETRY accumulates description and remembers the wrong guess", () => {
  let s = reduce(initialState(), { type: "START" });
  s = reduce(s, { type: "DESCRIBED", text: "It is big." });
  s = reduce(s, { type: "GUESS", animal: snake });
  s = reduce(s, { type: "GUESS_SPOKEN" });

  s = reduce(s, { type: "RETRY", text: "It has a long nose." });
  expect(s.phase).toBe("thinking");
  expect(s.guess).toBeNull();
  expect(s.guessedIds).toEqual(["snake"]); // remembered, so we won't repeat it
  expect(s.description).toBe("It is big. It has a long nose.");

  s = reduce(s, { type: "GUESS", animal: elephant });
  expect(s.guessedIds).toEqual(["snake", "elephant"]);
});

test("TIME_UP ends the game from any play phase; late actions are ignored after", () => {
  let s = reduce(initialState(), { type: "START" });
  s = reduce(s, { type: "DESCRIBED", text: "big nose" }); // thinking
  s = reduce(s, { type: "TIME_UP" });
  expect(s.phase).toBe("results");

  // A voice result resolving late must NOT resurrect the game.
  const after = reduce(s, { type: "GUESS", animal: elephant });
  expect(after.phase).toBe("results");
});

test("RESET returns to attract", () => {
  let s = reduce(initialState(), { type: "START" });
  s = reduce(s, { type: "RESET" });
  expect(s.phase).toBe("attract");
});
