import { useEffect, useReducer, useRef, useState } from "react";
import { initialState, reduce, currentGuess, isCounting } from "./game/machine";
import { drawAnimal, buildGuessPlan } from "./game/draw";
import { isLikelyMeaningful } from "./game/meaningful";
import { listenAndTranscribe, speak, unlockAudio, isDescription } from "./voice/bailian";
import { AttractScreen } from "./screens/AttractScreen";
import { DrawScreen } from "./screens/DrawScreen";
import { PlayScreen, type Msg } from "./screens/PlayScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import type { MascotState } from "./components/Mascot";

const GAME_SECONDS = 90;
const PHASE_TIMEOUT_MS = 20000; // watchdog so a single voice call can't hang forever

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/** "a" or "an" depending on whether the word starts with a vowel sound. */
const article = (name: string) => (/^[aeiou]/i.test(name.trim()) ? "an" : "a");

/** Spoken when the child says something that isn't a real description (rotates). */
const REPROMPTS = [
  "Hmm, tell me more! What does it look like?",
  "Can you say a whole sentence about it?",
  "What color is it? What can it do?",
];

/** A guess only fires for a meaningful description: cheap local filter, then LLM confirm. */
async function meaningful(text: string): Promise<boolean> {
  if (!isLikelyMeaningful(text)) return false;
  try {
    return (await withTimeout(isDescription(text), PHASE_TIMEOUT_MS)) === "yes";
  } catch {
    return true; // LLM unreachable -> trust the local heuristic rather than block the game
  }
}

/** Draw the next un-drawn animal and its guess plan, or null when all 9 are used. */
function nextDraw(drawnIds: string[]) {
  const target = drawAnimal(drawnIds);
  return target ? { target, plan: buildGuessPlan(target) } : null;
}

export default function App() {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [mascot, setMascot] = useState<MascotState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS);
  const busy = useRef(false);
  const playing = useRef(false);          // true between START and TIME_UP/RESET
  const remaining = useRef(GAME_SECONDS * 1000); // ms left; only decremented in counting phases
  const addMsg = (who: Msg["who"], text: string) => setMessages((m) => [...m, { who, text }]);
  const repromptIdx = useRef(0);
  const reprompt = async () => {
    const line = REPROMPTS[repromptIdx.current % REPROMPTS.length];
    repromptIdx.current++;
    addMsg("ai", line);
    setMascot("talking");
    await withTimeout(speak(line), PHASE_TIMEOUT_MS).catch(() => {});
    setMascot("listening");
  };

  // Countdown — runs ONLY during counting phases (paused while drawing), using real deltas.
  useEffect(() => {
    if (!isCounting(state.phase)) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      remaining.current -= now - last;
      last = now;
      const left = Math.max(0, Math.ceil(remaining.current / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        playing.current = false;
        dispatch({ type: "TIME_UP" });
      }
    }, 250);
    return () => clearInterval(id);
  }, [state.phase]);

  // Voice/game loop. `busy` guards re-entry (and StrictMode double-invoke); `playing`
  // lets in-flight listens bail out when the clock runs out.
  useEffect(() => {
    if (busy.current) return;

    if (state.phase === "describing") {
      busy.current = true;
      setMascot("listening");
      (async () => {
        try {
          // Keep listening until the child gives a MEANINGFUL description; nudge otherwise.
          while (playing.current) {
            let text = "";
            while (playing.current && !text) {
              try { text = await withTimeout(listenAndTranscribe(), PHASE_TIMEOUT_MS); }
              catch { text = ""; }
            }
            if (!text || !playing.current) return;
            addMsg("kid", text);
            if (await meaningful(text)) { if (playing.current) dispatch({ type: "DESCRIBED" }); return; }
            if (!playing.current) return;
            await reprompt(); // not a real description -> guide and listen again (no guess)
          }
        } finally {
          busy.current = false;
        }
      })();
    }

    if (state.phase === "guessing") {
      const g = currentGuess(state);
      if (!g) return;
      busy.current = true;
      const isLast = state.guessIndex === state.plan.length - 1;
      const line = isLast ? `Then it must be ${article(g.name)} ${g.name}! ${g.emoji}` : `Hmm… is it ${article(g.name)} ${g.name}? ${g.emoji}`;
      addMsg("ai", line); // emoji shown on screen; speak() strips it so the voice stays English
      setMascot("talking");
      (async () => {
        try { await withTimeout(speak(line), PHASE_TIMEOUT_MS); }
        catch { /* keep going even if audio failed */ }
        finally {
          setMascot("idle");
          busy.current = false;
          if (playing.current) dispatch({ type: "GUESS_SPOKEN" });
        }
      })();
    }

    if (state.phase === "awaiting") {
      busy.current = true;
      setMascot("listening");
      const isLast = state.guessIndex === state.plan.length - 1;
      (async () => {
        try {
          while (playing.current) {
            let text = "";
            while (playing.current && !text) {
              try { text = await withTimeout(listenAndTranscribe(), PHASE_TIMEOUT_MS); }
              catch { text = ""; }
            }
            if (!text || !playing.current) return;
            addMsg("kid", text);
            // On the correct (last) guess, any reply confirms it -> celebrate.
            if (isLast) { dispatch({ type: "CORRECT" }); return; }
            // On a wrong guess, only a MEANINGFUL description earns the next guess.
            if (await meaningful(text)) { if (playing.current) dispatch({ type: "NEXT_GUESS" }); return; }
            if (!playing.current) return;
            await reprompt();
          }
        } finally {
          busy.current = false;
        }
      })();
    }

    if (state.phase === "revealing" && state.target) {
      busy.current = true;
      const a = state.target;
      const drawn = state.drawnIds; // includes the just-finished target
      setMascot("celebrating");
      addMsg("ai", `Yes! It's ${article(a.name)} ${a.name}! ${a.emoji}`);
      (async () => {
        try { await withTimeout(speak(`Yes! It's ${article(a.name)} ${a.name}! Great job!`), PHASE_TIMEOUT_MS); }
        catch { /* best effort */ }
        finally {
          await new Promise((r) => setTimeout(r, 1500)); // let the image land
          setMascot("idle");
          busy.current = false;
          if (!playing.current) return;
          const d = nextDraw(drawn);
          if (!d) {
            dispatch({ type: "TIME_UP" }); // all 9 animals done — end the game
          } else {
            setMessages([]); // fresh conversation for the next animal
            dispatch({ type: "NEXT" });
            dispatch({ type: "DRAW", target: d.target, plan: d.plan });
          }
        }
      })();
    }
  }, [state.phase, state.guessIndex]);

  const startGame = () => {
    setMessages([]);
    unlockAudio();
    remaining.current = GAME_SECONDS * 1000;
    setSecondsLeft(GAME_SECONDS);
    playing.current = true;
    const d = nextDraw([]);
    dispatch({ type: "START" });
    if (d) dispatch({ type: "DRAW", target: d.target, plan: d.plan });
  };

  const goHome = () => {
    playing.current = false;
    dispatch({ type: "RESET" });
  };

  if (state.phase === "attract") return <AttractScreen onStart={startGame} />;
  if (state.phase === "results") return <ResultsScreen score={state.score} onDone={goHome} />;
  if (state.phase === "drawing") {
    return (
      <DrawScreen
        animal={state.target}
        score={state.score}
        secondsLeft={secondsLeft}
        onGo={() => dispatch({ type: "GO" })}
        onQuit={goHome}
      />
    );
  }

  return (
    <PlayScreen
      mascot={mascot}
      messages={messages}
      score={state.score}
      secondsLeft={secondsLeft}
      reveal={state.phase === "revealing" ? state.target : null}
      onQuit={goHome}
      orbActive={mascot === "listening"}
      orbLabel={mascot === "listening" ? "Listening…" : "Bibo is talking…"}
    />
  );
}
