export interface Animal {
  id: string;        // stable id, used for image filename: assets/animals/<id>.png
  name: string;      // display + spoken name, e.g. "Elephant"
  emoji: string;
  hints: string[];   // reference description phrases (not read aloud)
}

export type Phase =
  | "attract"
  | "picking"
  | "listening"   // recording the child
  | "thinking"    // ASR + inference running
  | "guessing"    // Bibo is speaking a guess
  | "awaiting"    // waiting for "try again" / "yes it is"
  | "celebrating";

export type Command = "try_again" | "confirm" | "unknown";
