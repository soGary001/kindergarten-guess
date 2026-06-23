import { expect, test } from "vitest";
import { isLikelyMeaningful } from "./meaningful";

test("accepts a real multi-word description", () => {
  expect(isLikelyMeaningful("It is big and grey.")).toBe(true);
  expect(isLikelyMeaningful("it has a long nose")).toBe(true);
});

test("rejects too-short utterances", () => {
  expect(isLikelyMeaningful("yes")).toBe(false);
  expect(isLikelyMeaningful("um ok")).toBe(false);
  expect(isLikelyMeaningful("")).toBe(false);
});

test("rejects pure filler / repetition", () => {
  expect(isLikelyMeaningful("la la la")).toBe(false);
  expect(isLikelyMeaningful("ha ha ha ha")).toBe(false);
});
