import { invoke } from "@tauri-apps/api/core";
import { recordUtterance } from "./vad";
import { encodeWav, resampleTo16k } from "./wav";

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

export async function speak(text: string): Promise<void> {
  const bytes = await invoke<number[]>("synthesize", { text });
  const blob = new Blob([new Uint8Array(bytes)], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  try {
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      // Corrupt/undecodable audio must reject immediately rather than hang
      // until the orchestrator's watchdog fires.
      audio.onerror = () => reject(new Error("audio playback failed"));
      audio.play().catch(reject);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
