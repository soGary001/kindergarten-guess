import { invoke } from "@tauri-apps/api/core";
import { recordUtterance } from "./vad";
import { encodeWav, resampleTo16k } from "./wav";

// macOS WKWebView blocks audio.play() that isn't started by a user gesture, and it
// blocks each freshly-created element. So we keep ONE element, "bless" it inside the
// Start tap (unlockAudio), and reuse it for every spoken line.
let player: HTMLAudioElement | null = null;

/** Call from inside a user gesture (the Start tap) to permit later programmatic audio. */
export function unlockAudio(): void {
  if (!player) player = new Audio();
  const silent = URL.createObjectURL(new Blob([encodeWav(new Float32Array(800), 16000)], { type: "audio/wav" }));
  player.src = silent;
  player.play().catch(() => {}).finally(() => URL.revokeObjectURL(silent));
}

export async function listenAndTranscribe(): Promise<string> {
  const { samples, sampleRate } = await recordUtterance();
  const wav = encodeWav(resampleTo16k(samples, sampleRate), 16000);
  return invoke<string>("transcribe", { wav: Array.from(new Uint8Array(wav)) });
}

export function inferAnimal(transcript: string): Promise<string> {
  return invoke<string>("infer_animal", { transcript });
}

export function classifyCommand(transcript: string): Promise<string> {
  return invoke<string>("classify_command", { transcript });
}

/**
 * Keep only English letters, digits, and safe punctuation before sending to TTS.
 * Emoji and any non-Latin characters are dropped so the voice never reads them
 * aloud in Chinese (e.g. an elephant emoji being voiced as "大象").
 */
export function toEnglishSpeech(text: string): string {
  return text
    .replace(/[^A-Za-z0-9 .,!?'’\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function speak(text: string): Promise<void> {
  const clean = toEnglishSpeech(text);
  if (!clean) return; // nothing speakable
  const bytes = await invoke<number[]>("synthesize", { text: clean });
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "audio/mpeg" }));
  // Reuse the gesture-unlocked element (created in unlockAudio); fall back if missing.
  const audio = (player ??= new Audio());
  audio.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      // Corrupt/undecodable audio must reject immediately rather than hang
      // until the orchestrator's watchdog fires.
      audio.onerror = () => reject(new Error("audio playback failed"));
      audio.play().catch(reject);
    });
  } finally {
    audio.onended = null;
    audio.onerror = null;
    URL.revokeObjectURL(url);
  }
}
