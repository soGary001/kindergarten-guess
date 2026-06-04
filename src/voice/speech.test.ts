import { expect, test } from "vitest";
import { toEnglishSpeech } from "./bailian";

test("strips emoji so the voice never reads them (in Chinese)", () => {
  expect(toEnglishSpeech("Hmm… is it a Snake? 🐍")).toBe("Hmm is it a Snake?");
  expect(toEnglishSpeech("Then it must be a Elephant! 🐘")).toBe("Then it must be a Elephant!");
});

test("keeps English letters, digits and basic punctuation", () => {
  expect(toEnglishSpeech("Yes! It's a Tiger! Great job!")).toBe("Yes! It's a Tiger! Great job!");
  expect(toEnglishSpeech("Say 'Try guessing again' to hear another guess!"))
    .toBe("Say 'Try guessing again' to hear another guess!");
});

test("drops non-Latin scripts entirely", () => {
  expect(toEnglishSpeech("大象 elephant")).toBe("elephant");
  expect(toEnglishSpeech("こんにちは")).toBe("");
});
