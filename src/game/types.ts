export interface Animal {
  id: string;        // stable id, used for image filename: assets/animals/<id>.png
  name: string;      // display + spoken name, e.g. "Elephant"
  emoji: string;
  hints: string[];   // reference description phrases (not read aloud)
}

export type Phase =
  | "attract"
  | "drawing"     // a random animal is drawn & shown; timer PAUSED until the child starts
  | "describing"  // listening to the child describe the drawn animal
  | "guessing"    // Bibo is speaking a guess
  | "awaiting"    // waiting for the child's response
  | "revealing"   // correct! show the animal image, then draw the next one
  | "results";    // time up — show the score

export type Command = "try_again" | "confirm" | "unknown";
