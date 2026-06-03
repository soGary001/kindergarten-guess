import type { Animal, Command, Phase } from "./types";

export interface GameState {
  phase: Phase;
  target: Animal | null;
  transcript: string;
  plan: Animal[];      // wrong... then correct
  guessIndex: number;  // index into plan of the current/last guess
}

export type Action =
  | { type: "START" }
  | { type: "PICK"; animal: Animal }
  | { type: "UTTERANCE_CAPTURED"; transcript: string }
  | { type: "PLAN_READY"; plan: Animal[] }
  | { type: "GUESS_SPOKEN" }
  | { type: "COMMAND"; command: Command }
  | { type: "RESET" };

export function initialState(): GameState {
  return { phase: "attract", target: null, transcript: "", plan: [], guessIndex: -1 };
}

/** Selector for the current/last guess. Use this instead of stashing it on state. */
export function currentGuess(s: GameState): Animal | null {
  return s.guessIndex >= 0 ? s.plan[s.guessIndex] ?? null : null;
}

/** Pure reducer: (GameState, Action) => GameState — directly usable with useReducer. */
export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "RESET":
      return initialState();
    case "START":
      return { ...initialState(), phase: "picking" };
    case "PICK":
      return { ...state, phase: "listening", target: action.animal };
    case "UTTERANCE_CAPTURED":
      return { ...state, phase: "thinking", transcript: action.transcript };
    case "PLAN_READY":
      return { ...state, phase: "guessing", plan: action.plan, guessIndex: 0 };
    case "GUESS_SPOKEN":
      return { ...state, phase: "awaiting" };
    case "COMMAND": {
      const cur = currentGuess(state);
      const isCorrect = !!cur && !!state.target && cur.id === state.target.id;
      if (action.command === "confirm" && isCorrect) {
        return { ...state, phase: "celebrating" };
      }
      if (action.command === "try_again") {
        const next = Math.min(state.guessIndex + 1, state.plan.length - 1);
        return { ...state, phase: "guessing", guessIndex: next };
      }
      // confirm-on-wrong or unknown: ignore — stay awaiting.
      return state;
    }
    default:
      return state;
  }
}
