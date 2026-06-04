import type { Animal, Phase } from "./types";

export interface GameState {
  phase: Phase;
  description: string;   // accumulated description of the CURRENT animal this round
  guess: Animal | null;  // the AI's current guess awaiting confirmation
  guessedIds: string[];  // animal ids already guessed this round (excluded on retry)
  score: number;         // animals correctly guessed this game
}

export type Action =
  | { type: "START" }
  | { type: "DESCRIBED"; text: string }   // child finished describing -> infer
  | { type: "GUESS"; animal: Animal }      // AI has an inference -> speak it
  | { type: "GUESS_SPOKEN" }               // AI finished speaking the guess
  | { type: "CORRECT" }                    // child confirmed -> score + reveal image
  | { type: "NEXT" }                       // reveal done -> fresh round, next animal
  | { type: "RETRY"; text: string }        // child said no / more -> re-infer
  | { type: "TIME_UP" }                    // 60s countdown expired
  | { type: "RESET" };                     // back to attract

export function initialState(): GameState {
  return { phase: "attract", description: "", guess: null, guessedIds: [], score: 0 };
}

const PLAY_PHASES: readonly Phase[] = ["describing", "thinking", "guessing", "awaiting", "revealing"];
export function isPlaying(p: Phase): boolean {
  return PLAY_PHASES.includes(p);
}

/**
 * Pure reducer. Play actions are guarded by the expected phase so a voice
 * result that resolves late (e.g. after TIME_UP) can never resurrect the game.
 */
export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "RESET":
      return initialState();
    case "START":
      return { phase: "describing", description: "", guess: null, guessedIds: [], score: 0 };
    case "TIME_UP":
      return isPlaying(state.phase) ? { ...state, phase: "results" } : state;
    case "DESCRIBED":
      if (state.phase !== "describing") return state;
      return { ...state, phase: "thinking", description: `${state.description} ${action.text}`.trim() };
    case "GUESS":
      if (state.phase !== "thinking") return state;
      return { ...state, phase: "guessing", guess: action.animal, guessedIds: [...state.guessedIds, action.animal.id] };
    case "GUESS_SPOKEN":
      if (state.phase !== "guessing") return state;
      return { ...state, phase: "awaiting" };
    case "CORRECT":
      if (state.phase !== "awaiting") return state;
      // Keep `guess` (the confirmed animal) so the reveal screen can show its image.
      return { ...state, phase: "revealing", score: state.score + 1 };
    case "NEXT":
      if (state.phase !== "revealing") return state;
      return { ...state, phase: "describing", description: "", guess: null, guessedIds: [] };
    case "RETRY":
      if (state.phase !== "awaiting") return state;
      return { ...state, phase: "thinking", description: `${state.description} ${action.text}`.trim(), guess: null };
    default:
      return state;
  }
}
