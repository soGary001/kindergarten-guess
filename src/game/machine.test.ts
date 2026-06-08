import { expect, test } from "vitest";
import { initialState, reduce, currentGuess } from "./machine";
import { animalByName } from "./animals";

const elephant = animalByName("Elephant")!;
const snake = animalByName("Snake")!;
const tiger = animalByName("Tiger")!;
const plan = [snake, tiger, elephant]; // 2 wrong, then the drawn target

test("starts in attract", () => {
  expect(initialState().phase).toBe("attract");
});

test("START enters drawing with a fresh score and no drawn animals", () => {
  const s = reduce(initialState(), { type: "START" });
  expect(s.phase).toBe("drawing");
  expect(s.score).toBe(0);
  expect(s.drawnIds).toEqual([]);
});

test("full round: draw -> go -> describe -> 2 wrong -> correct -> reveal -> next draw", () => {
  let s = reduce(initialState(), { type: "START" });

  s = reduce(s, { type: "DRAW", target: elephant, plan });
  expect(s.phase).toBe("drawing");      // card shown, timer still paused
  expect(s.target?.id).toBe("elephant");
  expect(s.drawnIds).toEqual(["elephant"]);

  s = reduce(s, { type: "GO" });
  expect(s.phase).toBe("describing");   // timer resumes

  s = reduce(s, { type: "DESCRIBED" });
  expect(s.phase).toBe("guessing");
  expect(currentGuess(s)?.id).toBe("snake"); // first wrong guess

  s = reduce(s, { type: "GUESS_SPOKEN" });
  s = reduce(s, { type: "NEXT_GUESS" });
  expect(currentGuess(s)?.id).toBe("tiger"); // second wrong guess

  s = reduce(s, { type: "GUESS_SPOKEN" });
  s = reduce(s, { type: "NEXT_GUESS" });
  expect(currentGuess(s)?.id).toBe("elephant"); // the target

  s = reduce(s, { type: "GUESS_SPOKEN" });
  s = reduce(s, { type: "CORRECT" });
  expect(s.phase).toBe("revealing");
  expect(s.score).toBe(1);

  s = reduce(s, { type: "NEXT" });
  expect(s.phase).toBe("drawing");      // draw the next animal, paused again
  expect(s.target).toBeNull();
  expect(s.drawnIds).toEqual(["elephant"]); // remembered so it won't repeat
});

test("TIME_UP ends the game and ignores late round actions", () => {
  let s = reduce(initialState(), { type: "START" });
  s = reduce(s, { type: "DRAW", target: elephant, plan });
  s = reduce(s, { type: "GO" });
  s = reduce(s, { type: "TIME_UP" });
  expect(s.phase).toBe("results");
  expect(reduce(s, { type: "DESCRIBED" }).phase).toBe("results");
});

test("RESET returns to attract", () => {
  let s = reduce(initialState(), { type: "START" });
  expect(reduce(s, { type: "RESET" }).phase).toBe("attract");
});
