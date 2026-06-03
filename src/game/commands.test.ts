import { expect, test } from "vitest";
import { matchCommand } from "./commands";

test("recognizes confirmation", () => {
  expect(matchCommand("Yes, it is!")).toBe("confirm");
  expect(matchCommand("yes")).toBe("confirm");
  expect(matchCommand("Yeah it is")).toBe("confirm");
});

test("recognizes try-again", () => {
  expect(matchCommand("Try guessing again.")).toBe("try_again");
  expect(matchCommand("try again")).toBe("try_again");
  expect(matchCommand("guess again please")).toBe("try_again");
});

test("confirm wins when both appear is avoided; ambiguous -> unknown", () => {
  expect(matchCommand("hmm I don't know")).toBe("unknown");
  expect(matchCommand("")).toBe("unknown");
});
