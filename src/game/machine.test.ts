import { expect, test } from "vitest";
import { initialState, reduce, currentGuess } from "./machine";
import { animalByName } from "./animals";

const elephant = animalByName("Elephant")!;

test("starts in attract", () => {
  expect(initialState().phase).toBe("attract");
});

test("happy path: pick -> listen -> infer -> guess wrong -> try again -> correct -> confirm -> celebrate", () => {
  let s = initialState();
  s = reduce(s, { type: "START" });
  expect(s.phase).toBe("picking");

  s = reduce(s, { type: "PICK", animal: elephant });
  expect(s.phase).toBe("listening");
  expect(s.target?.id).toBe("elephant");

  s = reduce(s, { type: "UTTERANCE_CAPTURED", transcript: "It's big. It has a long nose." });
  expect(s.phase).toBe("thinking");

  s = reduce(s, { type: "PLAN_READY", plan: [animalByName("Snake")!, elephant] });
  expect(s.phase).toBe("guessing");
  expect(currentGuess(s)?.id).toBe("snake");

  s = reduce(s, { type: "GUESS_SPOKEN" });
  expect(s.phase).toBe("awaiting");

  s = reduce(s, { type: "COMMAND", command: "try_again" });
  expect(s.phase).toBe("guessing");
  expect(currentGuess(s)?.id).toBe("elephant");

  s = reduce(s, { type: "GUESS_SPOKEN" });
  s = reduce(s, { type: "COMMAND", command: "confirm" });
  expect(s.phase).toBe("celebrating");
});

test("only try_again advances a wrong guess; confirm-on-wrong is ignored", () => {
  let s = initialState();
  s = reduce(reduce(s, { type: "START" }), { type: "PICK", animal: elephant });
  s = reduce(s, { type: "UTTERANCE_CAPTURED", transcript: "big nose" });
  s = reduce(s, { type: "PLAN_READY", plan: [animalByName("Snake")!, elephant] });
  s = reduce(s, { type: "GUESS_SPOKEN" }); // awaiting, current = snake (wrong)

  s = reduce(s, { type: "COMMAND", command: "confirm" });
  expect(s.phase).toBe("awaiting");
  expect(currentGuess(s)?.id).toBe("snake");

  s = reduce(s, { type: "COMMAND", command: "unknown" });
  expect(s.phase).toBe("awaiting");
  expect(currentGuess(s)?.id).toBe("snake");

  s = reduce(s, { type: "COMMAND", command: "try_again" });
  expect(s.phase).toBe("guessing");
  expect(currentGuess(s)?.id).toBe("elephant");
});

test("RESET returns to attract", () => {
  let s = initialState();
  s = reduce(s, { type: "START" });
  s = reduce(s, { type: "RESET" });
  expect(s.phase).toBe("attract");
});
