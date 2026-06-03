import { expect, test } from "vitest";
import { encodeWav, resampleTo16k } from "./wav";

test("produces a RIFF/WAVE header for 16k mono", () => {
  const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
  const buf = encodeWav(samples, 16000);
  const view = new DataView(buf);
  // "RIFF"
  expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe("RIFF");
  // "WAVE"
  expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe("WAVE");
  // sample rate at offset 24
  expect(view.getUint32(24, true)).toBe(16000);
  // 16-bit
  expect(view.getUint16(34, true)).toBe(16);
  // data length = 5 samples * 2 bytes
  expect(view.getUint32(40, true)).toBe(10);
});

test("clamps out-of-range samples", () => {
  const buf = encodeWav(new Float32Array([2, -2]), 16000);
  const view = new DataView(buf);
  expect(view.getInt16(44, true)).toBe(32767);
  expect(view.getInt16(46, true)).toBe(-32768);
});

test("resampleTo16k halves a 32k signal length (approx)", () => {
  const input = new Float32Array(3200); // 0.1s @ 32k
  const out = resampleTo16k(input, 32000);
  expect(out.length).toBe(1600);
});

test("resampleTo16k is a no-op at 16k", () => {
  const input = new Float32Array([0.1, 0.2, 0.3]);
  expect(resampleTo16k(input, 16000)).toBe(input);
});
