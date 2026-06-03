export interface VadOpts { speechThreshold: number; silenceMs: number; frameMs: number; }

/** Pure decision logic: feed per-frame RMS energy, returns true when the utterance is done. */
export class SilenceDetector {
  private started = false;
  private silentMs = 0;
  constructor(private opts: VadOpts) {}

  push(rms: number): boolean {
    if (rms >= this.opts.speechThreshold) {
      this.started = true;
      this.silentMs = 0;
      return false;
    }
    if (!this.started) return false;
    this.silentMs += this.opts.frameMs;
    return this.silentMs >= this.opts.silenceMs;
  }
}

/** Captures mic audio, auto-stops on trailing silence, resolves with Float32 PCM @ ctx rate. */
export async function recordUtterance(opts: VadOpts = { speechThreshold: 0.02, silenceMs: 900, frameMs: 50 }): Promise<{ samples: Float32Array; sampleRate: number }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const frameSize = Math.round((ctx.sampleRate * opts.frameMs) / 1000);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const det = new SilenceDetector(opts);
  const chunks: Float32Array[] = [];

  return new Promise((resolve) => {
    let buffer: number[] = [];
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(input));
      // Append per-element — do NOT use buffer.push(...input): spreading a 4096-element
      // typed array as args can throw RangeError (max call stack / arg count).
      for (let i = 0; i < input.length; i++) buffer.push(input[i]);
      while (buffer.length >= frameSize) {
        const frame = buffer.splice(0, frameSize);
        let sum = 0;
        for (const v of frame) sum += v * v;
        const rms = Math.sqrt(sum / frame.length);
        if (det.push(rms)) {
          processor.disconnect();
          source.disconnect();
          stream.getTracks().forEach((t) => t.stop());
          const total = chunks.reduce((n, c) => n + c.length, 0);
          const out = new Float32Array(total);
          let off = 0;
          for (const c of chunks) { out.set(c, off); off += c.length; }
          const sr = ctx.sampleRate;
          ctx.close();
          resolve({ samples: out, sampleRate: sr });
          return;
        }
      }
    };
    source.connect(processor);
    processor.connect(ctx.destination);
  });
}
