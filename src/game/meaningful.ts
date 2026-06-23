/**
 * Cheap local pre-filter: is this transcript plausibly a real description?
 * Rejects too-short utterances and pure filler/repetition (e.g. "la la la").
 * A `true` result is then confirmed by the LLM; `false` skips the API call.
 */
export function isLikelyMeaningful(text: string): boolean {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < 3) return false;          // need a few real words
  if (new Set(words).size < 2) return false;   // "la la la", "ha ha ha"
  return true;
}
