import type { Animal, Phase } from "./types";

export interface GameState {
  phase: Phase;
  target: Animal | null;  // the drawn animal for this round
  plan: Animal[];          // [wrong1, wrong2, target] — guesses for this round
  guessIndex: number;      // index into plan of the current guess (-1 before guessing)
  drawnIds: string[];      // every animal drawn this game (never repeated)
  score: number;           // animals completed
}

export type Action =
  | { type: "START" }
  | { type: "DRAW"; target: Animal; plan: Animal[] } // a fresh animal was drawn (shown to child)
  | { type: "GO" }                                    // child starts describing -> timer resumes
  | { type: "DESCRIBED" }                             // child described -> Bibo starts guessing
  | { type: "GUESS_SPOKEN" }
  | { type: "NEXT_GUESS" }                            // child responded, guess was wrong -> next
  | { type: "CORRECT" }                               // child responded on the target guess
  | { type: "NEXT" }                                  // reveal done -> draw the next animal
  | { type: "TIME_UP" }
  | { type: "RESET" };

export function initialState(): GameState {
  return { phase: "attract", target: null, plan: [], guessIndex: -1, drawnIds: [], score: 0 };
}

export function currentGuess(s: GameState): Animal | null {
  return s.guessIndex >= 0 ? s.plan[s.guessIndex] ?? null : null;
}

/** Phases where the countdown runs. Drawing, the success reveal, attract & results are PAUSED. */
const TIMED: readonly Phase[] = ["describing", "guessing", "awaiting"];
export function isCounting(p: Phase): boolean {
  return TIMED.includes(p);
}

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "RESET":
      return initialState();
    case "START":
      return { phase: "drawing", target: null, plan: [], guessIndex: -1, drawnIds: [], score: 0 };
    case "DRAW":
      if (state.phase !== "drawing") return state;
      return { ...state, target: action.target, plan: action.plan, guessIndex: -1, drawnIds: [...state.drawnIds, action.target.id] };
    case "GO":
      if (state.phase !== "drawing" || !state.target) return state;
      return { ...state, phase: "describing" };
    case "DESCRIBED":
      if (state.phase !== "describing") return state;
      return { ...state, phase: "guessing", guessIndex: 0 };
    case "GUESS_SPOKEN":
      if (state.phase !== "guessing") return state;
      return { ...state, phase: "awaiting" };
    case "NEXT_GUESS":
      if (state.phase !== "awaiting") return state;
      return { ...state, phase: "guessing", guessIndex: Math.min(state.guessIndex + 1, state.plan.length - 1) };
    case "CORRECT":
      if (state.phase !== "awaiting") return state;
      return { ...state, phase: "revealing", score: state.score + 1 };
    case "NEXT":
      if (state.phase !== "revealing") return state;
      return { ...state, phase: "drawing", target: null, plan: [], guessIndex: -1 };
    case "TIME_UP":
      // End from any active phase (timed phases, or "drawing" when all animals are used).
      return state.phase === "attract" || state.phase === "results" ? state : { ...state, phase: "results" };
    default:
      return state;
  }
}
