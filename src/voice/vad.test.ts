import { expect, test } from "vitest";
import { SilenceDetector } from "./vad";

test("fires done after enough trailing silence following speech", () => {
  const d = new SilenceDetector({ speechThreshold: 0.05, silenceMs: 300, frameMs: 100 });
  // speech frames
  expect(d.push(0.2)).toBe(false);
  expect(d.push(0.2)).toBe(false);
  // silence frames: 100,200,300ms
  expect(d.push(0.0)).toBe(false);
  expect(d.push(0.0)).toBe(false);
  expect(d.push(0.0)).toBe(true); // 300ms of silence reached -> done
});

test("does not fire if speech never started", () => {
  const d = new SilenceDetector({ speechThreshold: 0.05, silenceMs: 300, frameMs: 100 });
  expect(d.push(0.0)).toBe(false);
  expect(d.push(0.0)).toBe(false);
  expect(d.push(0.0)).toBe(false);
  expect(d.push(0.0)).toBe(false);
});
