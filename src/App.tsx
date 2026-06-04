import { useEffect, useReducer, useRef, useState } from "react";
import { initialState, reduce, isPlaying } from "./game/machine";
import { ANIMALS, animalByName } from "./game/animals";
import { matchCommand } from "./game/commands";
import type { Animal, Command } from "./game/types";
import { listenAndTranscribe, inferAnimal, classifyCommand, speak, unlockAudio } from "./voice/bailian";
import { AttractScreen } from "./screens/AttractScreen";
import { PlayScreen, type Msg } from "./screens/PlayScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import type { MascotState } from "./components/Mascot";

const GAME_SECONDS = 60;
const PHASE_TIMEOUT_MS = 20000; // watchdog so a single voice call can't hang forever

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

const namesFromIds = (ids: string[]) =>
  ids.map((id) => ANIMALS.find((a) => a.id === id)?.name).filter((n): n is string => !!n);

export default function App() {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [mascot, setMascot] = useState<MascotState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS);
  const busy = useRef(false);
  const playing = useRef(false);     // true between START and TIME_UP/RESET
  const deadline = useRef<number | null>(null);
  const addMsg = (who: Msg["who"], text: string) => setMessages((m) => [...m, { who, text }]);

  // 60s countdown, driven off an absolute deadline so phase changes don't drift it.
  useEffect(() => {
    if (!isPlaying(state.phase)) return;
    const id = setInterval(() => {
      const left = deadline.current ? Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)) : 0;
      setSecondsLeft(left);
      if (left <= 0) {
        playing.current = false;
        dispatch({ type: "TIME_UP" });
      }
    }, 250);
    return () => clearInterval(id);
  }, [state.phase]);

  // Voice/game loop, driven off phase transitions. `busy` guards re-entry (and StrictMode
  // double-invoke); `playing` lets in-flight listens bail out when the clock runs out.
  useEffect(() => {
    if (busy.current) return;

    if (state.phase === "describing") {
      busy.current = true;
      setMascot("listening");
      (async () => {
        try {
          let text = "";
          while (playing.current && !text) {
            try { text = await withTimeout(listenAndTranscribe(), PHASE_TIMEOUT_MS); }
            catch { text = ""; } // no speech yet — keep listening until the clock stops us
          }
          if (text && playing.current) {
            addMsg("kid", text);
            dispatch({ type: "DESCRIBED", text });
          }
        } finally {
          busy.current = false;
        }
      })();
    }

    if (state.phase === "thinking") {
      busy.current = true;
      setMascot("thinking");
      const guessedIds = state.guessedIds;
      const excluded = namesFromIds(guessedIds);
      const description = state.description;
      (async () => {
        try {
          // The AI's genuine best inference (avoids animals already guessed this round).
          let best: Animal | undefined;
          try {
            best = animalByName(await withTimeout(inferAnimal(description, excluded), PHASE_TIMEOUT_MS));
          } catch { /* fall through to a random remaining animal */ }
          if (!best) {
            const remaining = ANIMALS.filter((a) => !guessedIds.includes(a.id));
            best = remaining[Math.floor(Math.random() * remaining.length)] ?? ANIMALS[0];
          }
          // First two guesses are deliberately WRONG (more turns = more talking).
          // The real answer is offered from the third guess on.
          let toGuess = best;
          if (guessedIds.length < 2) {
            const wrongPool = ANIMALS.filter((a) => a.id !== best!.id && !guessedIds.includes(a.id));
            toGuess = wrongPool[Math.floor(Math.random() * wrongPool.length)] ?? best;
          }
          if (playing.current && toGuess) dispatch({ type: "GUESS", animal: toGuess });
        } finally {
          busy.current = false;
        }
      })();
    }

    if (state.phase === "guessing" && state.guess) {
      busy.current = true;
      const g = state.guess;
      const line = `Is it a ${g.name}? ${g.emoji}`;
      addMsg("ai", line); // emoji shown on screen; speak() strips it so the voice stays English
      setMascot("talking");
      (async () => {
        try {
          await withTimeout(speak(line), PHASE_TIMEOUT_MS);
        } catch { /* keep going even if audio failed */ }
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
      (async () => {
        try {
          let text = "";
          while (playing.current && !text) {
            try { text = await withTimeout(listenAndTranscribe(), PHASE_TIMEOUT_MS); }
            catch { text = ""; }
          }
          if (!text || !playing.current) return;
          addMsg("kid", text);
          let cmd: Command = matchCommand(text);
          if (cmd !== "confirm") {
            try { cmd = (await withTimeout(classifyCommand(text), PHASE_TIMEOUT_MS)) as Command; }
            catch { /* keep matchCommand result */ }
          }
          if (!playing.current) return;
          if (cmd === "confirm") {
            dispatch({ type: "CORRECT" }); // -> revealing (image + praise handled there)
          } else {
            // Not a yes — treat as more description and guess again.
            dispatch({ type: "RETRY", text });
          }
        } finally {
          busy.current = false;
        }
      })();
    }

    if (state.phase === "revealing" && state.guess) {
      busy.current = true;
      const a = state.guess;
      setMascot("celebrating");
      addMsg("ai", `Yes! It's a ${a.name}! ${a.emoji}`);
      (async () => {
        try {
          await withTimeout(speak(`Yes! It's a ${a.name}! Great job!`), PHASE_TIMEOUT_MS);
        } catch { /* best effort */ }
        finally {
          await new Promise((r) => setTimeout(r, 1500)); // let the image land
          setMascot("idle");
          busy.current = false;
          if (playing.current) {
            setMessages([]); // fresh conversation for the next animal
            dispatch({ type: "NEXT" });
          }
        }
      })();
    }
  }, [state.phase]);

  const startGame = () => {
    setMessages([]);
    unlockAudio();
    setSecondsLeft(GAME_SECONDS);
    deadline.current = Date.now() + GAME_SECONDS * 1000;
    playing.current = true;
    dispatch({ type: "START" });
  };

  const goHome = () => {
    playing.current = false;
    dispatch({ type: "RESET" });
  };

  if (state.phase === "attract") return <AttractScreen onStart={startGame} />;
  if (state.phase === "results") return <ResultsScreen score={state.score} onDone={goHome} />;

  return (
    <PlayScreen
      mascot={mascot}
      messages={messages}
      score={state.score}
      secondsLeft={secondsLeft}
      reveal={state.phase === "revealing" ? state.guess : null}
      orbActive={mascot === "listening"}
      orbLabel={mascot === "listening" ? "Listening…" : mascot === "thinking" ? "Bibo is thinking…" : "Bibo is talking…"}
    />
  );
}
