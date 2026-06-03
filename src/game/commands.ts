import type { Command } from "./types";

export function matchCommand(transcript: string): Command {
  const t = transcript.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "unknown";

  const tryAgain = /\b(try|guess(ing)?)\b.*\bagain\b/.test(t);
  if (tryAgain) return "try_again";

  const confirm = /\b(yes|yeah|yep|correct|right)\b/.test(t);
  if (confirm) return "confirm";

  return "unknown";
}
