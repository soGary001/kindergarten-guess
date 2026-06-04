export interface Animal {
  id: string;        // stable id, used for image filename: assets/animals/<id>.png
  name: string;      // display + spoken name, e.g. "Elephant"
  emoji: string;
  hints: string[];   // reference description phrases (not read aloud)
}

export type Phase =
  | "attract"
  | "describing"  // listening to the child describe the current animal
  | "thinking"    // ASR + inference running
  | "guessing"    // Bibo is speaking a guess
  | "awaiting"    // waiting for "yes" / more description
  | "revealing"   // correct! show the animal image, then start a fresh round
  | "results";    // 60s up — show the score

export type Command = "try_again" | "confirm" | "unknown";
