import { useEffect, useReducer, useRef, useState } from "react";
import { initialState, reduce, currentGuess } from "./game/machine";
import { planGuessSequence } from "./game/guessing";
import { matchCommand } from "./game/commands";
import { animalByName } from "./game/animals";
import type { Command } from "./game/types";
import { listenAndTranscribe, inferAnimal, classifyCommand, speak } from "./voice/bailian";
import { AttractScreen } from "./screens/AttractScreen";
import { PickScreen } from "./screens/PickScreen";
import { PlayScreen, type Msg } from "./screens/PlayScreen";
import { CelebrationScreen } from "./screens/CelebrationScreen";
import type { MascotState } from "./components/Mascot";

const PHASE_TIMEOUT_MS = 20000;  // watchdog: no single voice phase may hang longer than this
const MAX_AWAIT_RETRIES = 3;     // unrecognized replies before resetting for the next child

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export default function App() {
  // reduce is a pure (GameState, Action) => GameState, so useReducer is fully typed — no casts.
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [mascot, setMascot] = useState<MascotState>("idle");
  const busy = useRef(false);
  const addMsg = (who: Msg["who"], text: string) => setMessages((m) => [...m, { who, text }]);

  // Drive side effects off phase transitions. Every branch resets `busy` in finally and
  // resets the game on failure, so a network/mic/ASR/TTS error can never freeze the booth.
  useEffect(() => {
    if (busy.current) return;
    const guess = currentGuess(state);

    if (state.phase === "listening") {
      busy.current = true;
      setMascot("listening");
      (async () => {
        try {
          const transcript = await withTimeout(listenAndTranscribe(), PHASE_TIMEOUT_MS);
          addMsg("kid", transcript);
          dispatch({ type: "UTTERANCE_CAPTURED", transcript });
        } catch {
          dispatch({ type: "RESET" });
        } finally {
          busy.current = false;
        }
      })();
    }

    if (state.phase === "thinking") {
      busy.current = true;
      setMascot("thinking");
      (async () => {
        try {
          let target = state.target!;
          try {
            const inferred = await withTimeout(inferAnimal(state.transcript), PHASE_TIMEOUT_MS);
            target = animalByName(inferred) ?? state.target!;
          } catch { /* inference failed — fall back to the picked card */ }
          dispatch({ type: "PLAN_READY", plan: planGuessSequence(target) });
        } catch {
          dispatch({ type: "RESET" });
        } finally {
          busy.current = false;
        }
      })();
    }

    if (state.phase === "guessing" && guess) {
      busy.current = true;
      const isLast = state.guessIndex === state.plan.length - 1;
      const line = isLast ? `Then it must be a ${guess.name}! ${guess.emoji}` : `Hmm… is it a ${guess.name}? ${guess.emoji}`;
      addMsg("ai", line); // emoji shown on screen; speak() strips it so the voice stays English
      setMascot("talking");
      (async () => {
        try {
          await withTimeout(speak(line), PHASE_TIMEOUT_MS);
          dispatch({ type: "GUESS_SPOKEN" });
        } catch {
          dispatch({ type: "RESET" });
        } finally {
          setMascot("idle");
          busy.current = false;
        }
      })();
    }

    if (state.phase === "awaiting") {
      busy.current = true;
      setMascot("listening");
      const isCorrect = !!guess && guess.id === state.target?.id;
      (async () => {
        try {
          for (let attempt = 0; attempt < MAX_AWAIT_RETRIES; attempt++) {
            const transcript = await withTimeout(listenAndTranscribe(), PHASE_TIMEOUT_MS);
            addMsg("kid", transcript);
            let cmd: Command = matchCommand(transcript);
            if (cmd === "unknown") {
              try { cmd = (await withTimeout(classifyCommand(transcript), PHASE_TIMEOUT_MS)) as Command; }
              catch { cmd = "unknown"; }
            }
            // Only "try again", or "yes" on the CORRECT guess, advances the game.
            if (cmd === "try_again" || (cmd === "confirm" && isCorrect)) {
              dispatch({ type: "COMMAND", command: cmd });
              return;
            }
            // Unrecognized / confirm-on-wrong: re-prompt and listen again.
            const reprompt = isCorrect ? "Say 'Yes, it is!' if I'm right!" : "Say 'Try guessing again' to hear another guess!";
            addMsg("ai", reprompt);
            setMascot("talking");
            await withTimeout(speak(reprompt), PHASE_TIMEOUT_MS).catch(() => {});
            setMascot("listening");
          }
          dispatch({ type: "RESET" }); // exhausted retries — reset for the next child
        } catch {
          dispatch({ type: "RESET" });
        } finally {
          busy.current = false;
        }
      })();
    }

    if (state.phase === "celebrating") {
      busy.current = true;
      setMascot("celebrating");
      const name = state.target?.name ?? "it";
      const celebrate = `Yes! It's a ${name}! Great job!`;
      addMsg("ai", celebrate);
      (async () => {
        try {
          await withTimeout(speak(celebrate), PHASE_TIMEOUT_MS);
        } catch {
          /* celebration audio is best-effort; the screen + confetti still play */
        } finally {
          busy.current = false;
        }
      })();
    }
  }, [state.phase, state.guessIndex]);

  switch (state.phase) {
    case "attract":
      return <AttractScreen onStart={() => { setMessages([]); dispatch({ type: "START" }); }} />;
    case "picking":
      return <PickScreen onPick={(a) => dispatch({ type: "PICK", animal: a })} />;
    case "celebrating":
      return <CelebrationScreen animal={state.target!} onDone={() => dispatch({ type: "RESET" })} />;
    default:
      return (
        <PlayScreen
          target={state.target!}
          mascot={mascot}
          messages={messages}
          orbActive={mascot === "listening"}
          orbLabel={mascot === "listening" ? "I'm listening…" : mascot === "thinking" ? "Bibo is thinking…" : "Bibo is talking…"}
        />
      );
  }
}
