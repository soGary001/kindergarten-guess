# Guess the Animal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hands-free voice play station where a kindergartner describes one of 9 animals, an AI mascot deliberately guesses wrong 1-2 times then correct, packaged to .dmg/.exe/.apk with the API key kept out of the JS bundle.

**Architecture:** Tauri v2 shell. A web frontend (Vite + React + TypeScript) renders the Memphis UI and owns the game state machine and audio capture. A Rust core (Tauri commands) holds the obfuscated Bailian API key and performs all network calls (ASR, LLM inference, TTS). Voice is **batch-per-utterance**: the webview records a clip, auto-stops on silence (VAD), and sends the clip to Rust for one-shot recognition — this preserves the hands-free UX of the spec's "real-time + VAD" while being far more robust and unit-testable than a raw streaming socket.

**Tech Stack:** Tauri v2, Rust (reqwest, serde, base64), Vite + React 18 + TypeScript, Vitest (frontend tests), cargo test (Rust tests), canvas-confetti, Web Audio API for capture/VAD.

---

## Architectural Decisions (read before starting)

- **Voice is batch-per-utterance, not socket-streaming.** JS captures audio via `getUserMedia`, runs an energy-based VAD that stops the recording after ~900ms of trailing silence, encodes the clip to 16kHz mono WAV, and passes the bytes to the Rust `transcribe` command. Rust calls Bailian one-shot ASR and returns a transcript. This is a deliberate refinement of the spec's "real-time streaming" and is the intended design.
- **The API key never appears in source or the JS bundle.** `build.rs` reads the key from the `BAILIAN_API_KEY` environment variable at compile time, XOR-obfuscates it against a fixed pad, and generates `obfuscated_key.rs`. The plaintext key lives only in the builder's environment, never in git, never in JS. Runtime deobfuscation happens in Rust.
- **Inference is constrained to the 9 animals.** The LLM prompt lists all 9 and must return exactly one of those names. The frontend validates the returned name against the known set; an unknown result falls back to the engine's nearest-match (handled in Task 2.3).
- **Wrong-then-right is deterministic.** The game engine, not the LLM, decides the guess order. The LLM only (a) infers the target and (b) phrases lines. This guarantees the pedagogy every run.

### Bailian / DashScope endpoints (confirm exact model ids against current docs during Task 3)

- **LLM:** OpenAI-compatible endpoint `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`, model `qwen-plus`. Stable; used as-is in this plan.
- **ASR:** DashScope speech recognition for a recorded clip (Paraformer family, e.g. `paraformer-v2`). The exact request shape is verified in Task 3.4 against docs; the Rust client isolates this in one function so a doc-driven tweak touches one place.
- **TTS:** DashScope CosyVoice (`cosyvoice-v1`), an English-capable voice id (default candidate `longxiaochun`; final voice chosen in Task 3.5). Returns audio bytes played by the webview.

---

## File Structure

```
kindergarten-guess/
  package.json
  vite.config.ts
  vitest.config.ts
  tsconfig.json
  index.html
  src/                          # frontend
    main.tsx                    # React entry
    App.tsx                     # screen router by game phase
    styles/
      tokens.css                # Bubblegum Pop palette + Memphis primitives
      global.css
    game/
      animals.ts                # the 9 animals (data)
      types.ts                  # shared TS types
      guessing.ts               # selectWrongGuesses, planGuessSequence (pure)
      commands.ts               # matchCommand (pure)
      machine.ts                # game state machine (pure reducer)
    voice/
      vad.ts                    # energy VAD + recorder controller
      wav.ts                    # PCM -> 16k mono WAV encoder (pure)
      bailian.ts                # thin wrappers over Tauri invoke()
    components/
      MemphisBackground.tsx     # scattered shapes
      Mascot.tsx                # Bibo with states
      SpeechBubble.tsx
      ListeningOrb.tsx
      AnimalCard.tsx
    screens/
      AttractScreen.tsx
      PickScreen.tsx
      PlayScreen.tsx            # Big Stage layout
      CelebrationScreen.tsx
  src-tauri/
    Cargo.toml
    build.rs                    # reads BAILIAN_API_KEY env -> generates obfuscated_key.rs
    tauri.conf.json
    src/
      main.rs                   # tauri::Builder, command registration
      keystore.rs               # deobfuscate (uses generated obfuscated_key.rs)
      bailian/
        mod.rs
        llm.rs                  # build_llm_request, parse_llm_response, call
        asr.rs                  # transcribe clip
        tts.rs                  # synthesize
      commands.rs               # #[tauri::command] infer_animal, transcribe, synthesize
  assets/
    animals/                    # 9 pre-generated scene images (Task 6)
  scripts/
    generate-images.md          # how the 9 images were produced (Task 6)
```

---

## Phase 0 — Project scaffold

### Task 0.1: Initialize Vite + React + TS frontend

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Scaffold with Vite**

Run:
```bash
npm create vite@latest . -- --template react-ts
npm install
```
If the directory is non-empty, choose "Ignore files and continue" — the existing `docs/` and `.git/` must be preserved.

- [ ] **Step 2: Replace `src/App.tsx` with a phase placeholder**

```tsx
export default function App() {
  return <div>Guess the Animal — scaffold OK</div>;
}
```

- [ ] **Step 3: Run dev server to verify it boots**

Run: `npm run dev`
Expected: Vite serves on localhost with no errors; page shows "scaffold OK". Stop with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite react-ts frontend"
```

### Task 0.2: Add Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 3: Add test script to `package.json`**

Add to `"scripts"`: `"test": "vitest run"`.

- [ ] **Step 4: Add a smoke test `src/smoke.test.ts`**

```ts
import { expect, test } from "vitest";
test("vitest runs", () => { expect(1 + 1).toBe(2); });
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: add vitest"
```

### Task 0.3: Initialize Tauri v2

**Files:**
- Create: `src-tauri/` (via CLI), modify `package.json`

- [ ] **Step 1: Add Tauri CLI and init**

Run:
```bash
npm install -D @tauri-apps/cli@^2
npm install @tauri-apps/api@^2
npx tauri init --app-name "GuessTheAnimal" --window-title "Guess the Animal" --frontend-dist ../dist --dev-url http://localhost:5173 --before-dev-command "npm run dev" --before-build-command "npm run build"
```

- [ ] **Step 2: Verify desktop dev build boots**

Run: `npx tauri dev`
Expected: a native window opens showing the scaffold page. Close it.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: init tauri v2 shell"
```

---

## Phase 1 — API key obfuscation (Rust, TDD)

### Task 1.1: build.rs generates an obfuscated key from the environment

**Files:**
- Create: `src-tauri/build.rs`
- Modify: `src-tauri/Cargo.toml` (ensure `build = "build.rs"` and add `base64` to `[dependencies]`)

- [ ] **Step 1: Write `build.rs`**

```rust
use std::env;
use std::fs;
use std::path::Path;

// Fixed obfuscation pad. Not a secret by itself — it only makes the key
// non-plaintext in the binary. Real protection is "key never in source/JS".
const PAD: &[u8] = b"bibo-guess-the-animal-pad-v1-do-not-rely-on-secrecy";

fn main() {
    println!("cargo:rerun-if-env-changed=BAILIAN_API_KEY");
    let key = env::var("BAILIAN_API_KEY").unwrap_or_default();
    let obf: Vec<u8> = key
        .as_bytes()
        .iter()
        .enumerate()
        .map(|(i, b)| b ^ PAD[i % PAD.len()])
        .collect();
    let b64 = base64_encode(&obf);
    let out = env::var("OUT_DIR").unwrap();
    let dest = Path::new(&out).join("obfuscated_key.rs");
    fs::write(
        &dest,
        format!(
            "pub const OBFUSCATED_KEY_B64: &str = \"{b64}\";\npub const PAD: &[u8] = b\"bibo-guess-the-animal-pad-v1-do-not-rely-on-secrecy\";\n"
        ),
    )
    .unwrap();
}

fn base64_encode(bytes: &[u8]) -> String {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    STANDARD.encode(bytes)
}
```

Add to `src-tauri/Cargo.toml`:
```toml
[build-dependencies]
base64 = "0.22"

[dependencies]
base64 = "0.22"
```

- [ ] **Step 2: Build to confirm generation works**

Run: `cd src-tauri && BAILIAN_API_KEY=test-key-123 cargo build 2>&1 | tail -5; cd ..`
Expected: build succeeds. The file `src-tauri/target/debug/build/*/out/obfuscated_key.rs` exists. (Empty env var is allowed and produces an empty key — Task 1.2 handles that.)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/build.rs src-tauri/Cargo.toml
git commit -m "feat: build.rs obfuscates BAILIAN_API_KEY at compile time"
```

### Task 1.2: keystore.rs deobfuscates (TDD)

**Files:**
- Create: `src-tauri/src/keystore.rs`
- Modify: `src-tauri/src/main.rs` (add `mod keystore;`)

- [ ] **Step 1: Write the failing test inside `keystore.rs`**

```rust
include!(concat!(env!("OUT_DIR"), "/obfuscated_key.rs"));

use base64::{engine::general_purpose::STANDARD, Engine as _};

/// Returns the plaintext Bailian API key, or empty string if none was built in.
pub fn api_key() -> String {
    let obf = STANDARD.decode(OBFUSCATED_KEY_B64).unwrap_or_default();
    let bytes: Vec<u8> = obf
        .iter()
        .enumerate()
        .map(|(i, b)| b ^ PAD[i % PAD.len()])
        .collect();
    String::from_utf8(bytes).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrips_the_built_in_key() {
        // build.rs in CI/test sets BAILIAN_API_KEY=roundtrip-key-xyz
        assert_eq!(api_key(), "roundtrip-key-xyz");
    }
}
```

Add `mod keystore;` near the top of `src-tauri/src/main.rs`.

- [ ] **Step 2: Run the test to verify it fails (wrong/empty key)**

Run: `cd src-tauri && cargo test keystore 2>&1 | tail -15; cd ..`
Expected: FAIL — built-in key does not equal `roundtrip-key-xyz` (it was built with `test-key-123` or empty).

- [ ] **Step 3: Make it pass by building tests with the matching env var**

Run: `cd src-tauri && BAILIAN_API_KEY=roundtrip-key-xyz cargo test keystore 2>&1 | tail -15; cd ..`
Expected: PASS. This proves the obfuscate→deobfuscate roundtrip is correct.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/keystore.rs src-tauri/src/main.rs
git commit -m "feat: deobfuscate api key at runtime with roundtrip test"
```

---

## Phase 2 — Game engine (frontend, pure logic, TDD)

### Task 2.1: Animal data and shared types

**Files:**
- Create: `src/game/types.ts`, `src/game/animals.ts`
- Test: `src/game/animals.test.ts`

- [ ] **Step 1: Write the failing test `src/game/animals.test.ts`**

```ts
import { expect, test } from "vitest";
import { ANIMALS, animalByName } from "./animals";

test("there are exactly 9 animals with unique names", () => {
  expect(ANIMALS).toHaveLength(9);
  expect(new Set(ANIMALS.map((a) => a.name)).size).toBe(9);
});

test("animalByName is case-insensitive and trims", () => {
  expect(animalByName("  Elephant ")?.name).toBe("Elephant");
  expect(animalByName("ELEPHANT")?.name).toBe("Elephant");
  expect(animalByName("dragon")).toBeUndefined();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- animals`
Expected: FAIL — cannot find module `./animals`.

- [ ] **Step 3: Implement `src/game/types.ts`**

```ts
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
```

- [ ] **Step 4: Implement `src/game/animals.ts`**

```ts
import type { Animal } from "./types";

export const ANIMALS: Animal[] = [
  { id: "monkey",   name: "Monkey",   emoji: "🐵", hints: ["It likes banana.", "It has a long tail."] },
  { id: "kangaroo", name: "Kangaroo", emoji: "🦘", hints: ["It has a pouch.", "It hops."] },
  { id: "elephant", name: "Elephant", emoji: "🐘", hints: ["It's big.", "It has a trunk."] },
  { id: "turtle",   name: "Turtle",   emoji: "🐢", hints: ["It crawls.", "It has a shell."] },
  { id: "tiger",    name: "Tiger",    emoji: "🐯", hints: ["It eats meat.", "It has stripes on its body."] },
  { id: "crab",     name: "Crab",     emoji: "🦀", hints: ["It has claws.", "It lives in the sea."] },
  { id: "bird",     name: "Bird",     emoji: "🐦", hints: ["It has a beak.", "It likes to eat seeds."] },
  { id: "snake",    name: "Snake",    emoji: "🐍", hints: ["It slithers.", "It lives in the hole."] },
  { id: "spider",   name: "Spider",   emoji: "🕷️", hints: ["It has 8 legs.", "It makes a web."] },
];

export function animalByName(name: string): Animal | undefined {
  const n = name.trim().toLowerCase();
  return ANIMALS.find((a) => a.name.toLowerCase() === n);
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- animals`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add src/game/types.ts src/game/animals.ts src/game/animals.test.ts
git commit -m "feat: add 9 animals data and lookup with tests"
```

### Task 2.2: Guess planning — wrong-then-right (TDD)

**Files:**
- Create: `src/game/guessing.ts`
- Test: `src/game/guessing.test.ts`

- [ ] **Step 1: Write the failing test `src/game/guessing.test.ts`**

```ts
import { expect, test } from "vitest";
import { planGuessSequence } from "./guessing";
import { animalByName } from "./animals";

const target = animalByName("Elephant")!;

test("plan ends with the correct animal", () => {
  const seq = planGuessSequence(target, () => 0);
  expect(seq[seq.length - 1].id).toBe("elephant");
});

test("plan has 1 or 2 wrong guesses before the correct one", () => {
  const seq = planGuessSequence(target, () => 0);
  const wrongCount = seq.length - 1;
  expect(wrongCount).toBeGreaterThanOrEqual(1);
  expect(wrongCount).toBeLessThanOrEqual(2);
});

test("wrong guesses are never the target and never repeat", () => {
  const seq = planGuessSequence(target, () => 0.99);
  const wrongs = seq.slice(0, -1);
  expect(wrongs.every((a) => a.id !== "elephant")).toBe(true);
  expect(new Set(wrongs.map((a) => a.id)).size).toBe(wrongs.length);
});

test("rng controls the number of wrong guesses", () => {
  // rng < 0.5 -> 1 wrong; rng >= 0.5 -> 2 wrong
  expect(planGuessSequence(target, () => 0.1)).toHaveLength(2);
  expect(planGuessSequence(target, () => 0.9)).toHaveLength(3);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- guessing`
Expected: FAIL — cannot find module `./guessing`.

- [ ] **Step 3: Implement `src/game/guessing.ts`**

```ts
import type { Animal } from "./types";
import { ANIMALS } from "./animals";

/** rng() must return a float in [0, 1). Inject Math.random in production. */
export function planGuessSequence(
  target: Animal,
  rng: () => number = Math.random,
): Animal[] {
  const wrongCount = rng() < 0.5 ? 1 : 2;
  const pool = ANIMALS.filter((a) => a.id !== target.id);

  const wrongs: Animal[] = [];
  while (wrongs.length < wrongCount && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    wrongs.push(pool.splice(idx, 1)[0]);
  }
  return [...wrongs, target];
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- guessing`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/game/guessing.ts src/game/guessing.test.ts
git commit -m "feat: deterministic wrong-then-right guess planning with tests"
```

### Task 2.3: Command matching (TDD)

**Files:**
- Create: `src/game/commands.ts`
- Test: `src/game/commands.test.ts`

- [ ] **Step 1: Write the failing test `src/game/commands.test.ts`**

```ts
import { expect, test } from "vitest";
import { matchCommand } from "./commands";

test("recognizes confirmation", () => {
  expect(matchCommand("Yes, it is!")).toBe("confirm");
  expect(matchCommand("yes")).toBe("confirm");
  expect(matchCommand("Yeah it is")).toBe("confirm");
});

test("recognizes try-again", () => {
  expect(matchCommand("Try guessing again.")).toBe("try_again");
  expect(matchCommand("try again")).toBe("try_again");
  expect(matchCommand("guess again please")).toBe("try_again");
});

test("confirm wins when both appear is avoided; ambiguous -> unknown", () => {
  expect(matchCommand("hmm I don't know")).toBe("unknown");
  expect(matchCommand("")).toBe("unknown");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- commands`
Expected: FAIL — cannot find module `./commands`.

- [ ] **Step 3: Implement `src/game/commands.ts`**

```ts
import type { Command } from "./types";

export function matchCommand(transcript: string): Command {
  const t = transcript.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "unknown";

  const tryAgain = /\b(try|guess(ing)?)\b.*\bagain\b/.test(t) || /\btry again\b/.test(t);
  if (tryAgain) return "try_again";

  const confirm = /\b(yes|yeah|yep|correct|right)\b/.test(t);
  if (confirm) return "confirm";

  return "unknown";
}
```

> Note: `try_again` is checked before `confirm` so "try again" never mis-reads as confirm. The LLM intent fallback for ambiguous transcripts is wired in Task 7 (when `matchCommand` returns `unknown` during the `awaiting` phase, the app asks the LLM to classify).

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- commands`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/game/commands.ts src/game/commands.test.ts
git commit -m "feat: fuzzy command matching for try-again/confirm with tests"
```

### Task 2.4: Game state machine (TDD)

**Files:**
- Create: `src/game/machine.ts`
- Test: `src/game/machine.test.ts`

- [ ] **Step 1: Write the failing test `src/game/machine.test.ts`**

```ts
import { expect, test } from "vitest";
import { initialState, reduce } from "./machine";
import { animalByName } from "./animals";

const elephant = animalByName("Elephant")!;

test("starts in attract", () => {
  expect(initialState().phase).toBe("attract");
});

test("happy path: pick -> listen -> infer -> guess wrong -> try again -> correct -> confirm -> celebrate", () => {
  let s = initialState();
  s = reduce(s, { type: "START" });
  expect(s.phase).toBe("picking");

  s = reduce(s, { type: "PICK", animal: elephant });
  expect(s.phase).toBe("listening");
  expect(s.target?.id).toBe("elephant");

  s = reduce(s, { type: "UTTERANCE_CAPTURED", transcript: "It's big. It has a long nose." });
  expect(s.phase).toBe("thinking");

  // inference resolves + a deterministic plan with exactly 1 wrong is injected
  s = reduce(s, { type: "PLAN_READY", plan: [animalByName("Snake")!, elephant] });
  expect(s.phase).toBe("guessing");
  expect(s.currentGuess?.id).toBe("snake");

  s = reduce(s, { type: "GUESS_SPOKEN" });
  expect(s.phase).toBe("awaiting");

  s = reduce(s, { type: "COMMAND", command: "try_again" });
  expect(s.phase).toBe("guessing");
  expect(s.currentGuess?.id).toBe("elephant");

  s = reduce(s, { type: "GUESS_SPOKEN" });
  s = reduce(s, { type: "COMMAND", command: "confirm" });
  expect(s.phase).toBe("celebrating");
});

test("confirm before the correct guess is ignored (still awaiting)", () => {
  let s = initialState();
  s = reduce(reduce(s, { type: "START" }), { type: "PICK", animal: elephant });
  s = reduce(s, { type: "UTTERANCE_CAPTURED", transcript: "big nose" });
  s = reduce(s, { type: "PLAN_READY", plan: [animalByName("Snake")!, elephant] });
  s = reduce(s, { type: "GUESS_SPOKEN" }); // awaiting, current = snake (wrong)
  s = reduce(s, { type: "COMMAND", command: "confirm" });
  // child confirmed a wrong guess — treat as try_again so the game advances
  expect(s.phase).toBe("guessing");
  expect(s.currentGuess?.id).toBe("elephant");
});

test("RESET returns to attract", () => {
  let s = initialState();
  s = reduce(s, { type: "START" });
  s = reduce(s, { type: "RESET" });
  expect(s.phase).toBe("attract");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- machine`
Expected: FAIL — cannot find module `./machine`.

- [ ] **Step 3: Implement `src/game/machine.ts`**

```ts
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

function currentGuess(s: GameState): Animal | null {
  return s.guessIndex >= 0 ? s.plan[s.guessIndex] ?? null : null;
}

// Re-export a convenience getter used by tests and UI.
export function withCurrent(s: GameState): GameState & { currentGuess: Animal | null } {
  return { ...s, currentGuess: currentGuess(s) };
}

export function reduce(state: GameState, action: Action): GameState & { currentGuess: Animal | null } {
  const wrap = (s: GameState) => withCurrent(s);

  switch (action.type) {
    case "RESET":
      return wrap(initialState());
    case "START":
      return wrap({ ...initialState(), phase: "picking" });
    case "PICK":
      return wrap({ ...state, phase: "listening", target: action.animal });
    case "UTTERANCE_CAPTURED":
      return wrap({ ...state, phase: "thinking", transcript: action.transcript });
    case "PLAN_READY":
      return wrap({ ...state, phase: "guessing", plan: action.plan, guessIndex: 0 });
    case "GUESS_SPOKEN":
      return wrap({ ...state, phase: "awaiting" });
    case "COMMAND": {
      const cur = currentGuess(state);
      const isCorrect = !!cur && !!state.target && cur.id === state.target.id;
      if (action.command === "confirm" && isCorrect) {
        return wrap({ ...state, phase: "celebrating" });
      }
      // try_again, OR confirm on a wrong guess, OR unknown: advance to next guess
      const next = Math.min(state.guessIndex + 1, state.plan.length - 1);
      return wrap({ ...state, phase: "guessing", guessIndex: next });
    }
    default:
      return wrap(state);
  }
}
```

> The `reduce` return type includes a derived `currentGuess` for ergonomic UI/test use. `unknown` commands during `awaiting` advance the guess; the LLM fallback in Task 7 upgrades `unknown` to a real command before this point when possible.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- machine`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/game/machine.ts src/game/machine.test.ts
git commit -m "feat: game state machine with full happy-path tests"
```

---

## Phase 3 — Bailian Rust client + Tauri commands

### Task 3.1: LLM request building and response parsing (TDD)

**Files:**
- Create: `src-tauri/src/bailian/mod.rs`, `src-tauri/src/bailian/llm.rs`
- Modify: `src-tauri/src/main.rs` (`mod bailian;`), `src-tauri/Cargo.toml` (add `serde`, `serde_json`, `reqwest`)

- [ ] **Step 1: Add dependencies to `src-tauri/Cargo.toml`**

```toml
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["json"] }
```

- [ ] **Step 2: Write the failing test in `src-tauri/src/bailian/llm.rs`**

```rust
use serde_json::Value;

const ANIMALS: [&str; 9] = [
    "Monkey", "Kangaroo", "Elephant", "Turtle", "Tiger", "Crab", "Bird", "Snake", "Spider",
];

/// Builds the chat-completions request body that constrains the model to the 9 animals.
pub fn build_llm_request(transcript: &str) -> Value {
    let system = format!(
        "You are helping a kindergarten English game. The child describes ONE of these \
         animals: {}. Read the child's description and reply with ONLY the single best-matching \
         animal name from that list, exactly as written, with no other words.",
        ANIMALS.join(", ")
    );
    serde_json::json!({
        "model": "qwen-plus",
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": transcript }
        ],
        "temperature": 0
    })
}

/// Extracts the animal name from a chat-completions response, normalized to one of the 9
/// or None if the model returned something off-list.
pub fn parse_llm_response(body: &Value) -> Option<String> {
    let content = body
        .get("choices")?.get(0)?
        .get("message")?.get("content")?
        .as_str()?;
    let cleaned = content.trim().trim_matches(|c: char| !c.is_alphabetic());
    ANIMALS
        .iter()
        .find(|a| a.eq_ignore_ascii_case(cleaned))
        .map(|a| a.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_lists_all_animals_and_pins_model() {
        let body = build_llm_request("It's big. It has a long nose.");
        assert_eq!(body["model"], "qwen-plus");
        let sys = body["messages"][0]["content"].as_str().unwrap();
        for a in ANIMALS { assert!(sys.contains(a), "system prompt missing {a}"); }
    }

    #[test]
    fn parses_clean_and_noisy_responses() {
        let mk = |c: &str| serde_json::json!({"choices":[{"message":{"content": c}}]});
        assert_eq!(parse_llm_response(&mk("Elephant")), Some("Elephant".into()));
        assert_eq!(parse_llm_response(&mk("  elephant. ")), Some("Elephant".into()));
        assert_eq!(parse_llm_response(&mk("Dragon")), None);
    }
}
```

Create `src-tauri/src/bailian/mod.rs`:
```rust
pub mod llm;
pub mod asr;
pub mod tts;
```
Add `mod bailian;` to `src-tauri/src/main.rs`.

- [ ] **Step 3: Run to verify it fails then passes**

Run: `cd src-tauri && cargo test bailian::llm 2>&1 | tail -20; cd ..`
First expected: FAIL (asr/tts modules referenced by mod.rs don't exist yet) — create empty `asr.rs` and `tts.rs` with `// placeholder for Task 3.4/3.5` then re-run.
Final expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/bailian src-tauri/src/main.rs src-tauri/Cargo.toml
git commit -m "feat: bailian llm request builder + response parser with tests"
```

### Task 3.2: LLM network call

**Files:**
- Modify: `src-tauri/src/bailian/llm.rs`

- [ ] **Step 1: Add the async call function**

```rust
pub async fn infer_animal(api_key: &str, transcript: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions")
        .bearer_auth(api_key)
        .json(&build_llm_request(transcript))
        .send()
        .await
        .map_err(|e| format!("llm request failed: {e}"))?;
    let body: Value = resp.json().await.map_err(|e| format!("llm decode failed: {e}"))?;
    parse_llm_response(&body).ok_or_else(|| "no on-list animal in response".to_string())
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd src-tauri && cargo build 2>&1 | tail -5; cd ..`
Expected: builds. (Network is exercised manually in Task 3.6.)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/bailian/llm.rs && git commit -m "feat: bailian llm network call"
```

### Task 3.3: WAV encoder for captured audio (frontend, TDD)

**Files:**
- Create: `src/voice/wav.ts`
- Test: `src/voice/wav.test.ts`

- [ ] **Step 1: Write the failing test `src/voice/wav.test.ts`**

```ts
import { expect, test } from "vitest";
import { encodeWav } from "./wav";

test("produces a RIFF/WAVE header for 16k mono", () => {
  const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
  const buf = encodeWav(samples, 16000);
  const view = new DataView(buf);
  // "RIFF"
  expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe("RIFF");
  // "WAVE"
  expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe("WAVE");
  // sample rate at offset 24
  expect(view.getUint32(24, true)).toBe(16000);
  // 16-bit
  expect(view.getUint16(34, true)).toBe(16);
  // data length = 5 samples * 2 bytes
  expect(view.getUint32(40, true)).toBe(10);
});

test("clamps out-of-range samples", () => {
  const buf = encodeWav(new Float32Array([2, -2]), 16000);
  const view = new DataView(buf);
  expect(view.getInt16(44, true)).toBe(32767);
  expect(view.getInt16(46, true)).toBe(-32768);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- wav`
Expected: FAIL — cannot find module `./wav`.

- [ ] **Step 3: Implement `src/voice/wav.ts`**

```ts
/** Encode mono Float32 PCM (-1..1) to a 16-bit PCM WAV ArrayBuffer. */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const dataLen = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const view = new DataView(buf);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);          // PCM chunk size
  view.setUint16(20, 1, true);           // PCM format
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);           // block align
  view.setUint16(34, 16, true);          // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataLen, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 32768 : s * 32767, true);
    off += 2;
  }
  return buf;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- wav`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/voice/wav.ts src/voice/wav.test.ts
git commit -m "feat: 16k mono wav encoder with tests"
```

### Task 3.4: ASR call (clip transcription)

**Files:**
- Modify: `src-tauri/src/bailian/asr.rs`

- [ ] **Step 1: Read current DashScope speech-recognition docs**

Confirm the request shape for recorded-clip recognition (Paraformer family). The function below targets the DashScope multimodal/ASR HTTP API; adjust the URL, model id (`paraformer-v2`), and JSON keys to match current docs. Keep all Bailian-specific shape in this one function.

- [ ] **Step 2: Implement `transcribe`**

```rust
use base64::{engine::general_purpose::STANDARD, Engine as _};

/// Transcribes a WAV clip (bytes) to English text via DashScope ASR.
/// NOTE: verify endpoint/model/keys against current DashScope docs (Task 3.4 Step 1).
pub async fn transcribe(api_key: &str, wav_bytes: &[u8]) -> Result<String, String> {
    let audio_b64 = STANDARD.encode(wav_bytes);
    let client = reqwest::Client::new();
    let resp = client
        .post("https://dashscope.aliyuncs.com/api/v1/services/audio/asr/recognition")
        .bearer_auth(api_key)
        .json(&serde_json::json!({
            "model": "paraformer-v2",
            "input": { "audio": format!("data:audio/wav;base64,{audio_b64}"), "language": "en" }
        }))
        .send()
        .await
        .map_err(|e| format!("asr request failed: {e}"))?;
    let body: serde_json::Value = resp.json().await.map_err(|e| format!("asr decode failed: {e}"))?;
    // Adjust path to match the documented response shape.
    body.get("output").and_then(|o| o.get("text")).and_then(|t| t.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("no transcript in asr response: {body}"))
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd src-tauri && cargo build 2>&1 | tail -5; cd ..`
Expected: builds.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/bailian/asr.rs && git commit -m "feat: bailian asr clip transcription"
```

### Task 3.5: TTS call (synthesize speech)

**Files:**
- Modify: `src-tauri/src/bailian/tts.rs`

- [ ] **Step 1: Read current DashScope CosyVoice docs**

Confirm endpoint, model (`cosyvoice-v1`), and an English-capable voice id. The function returns raw audio bytes (mp3/wav) that the webview plays.

- [ ] **Step 2: Implement `synthesize`**

```rust
/// Synthesizes English speech, returning audio bytes (e.g. mp3).
/// NOTE: verify endpoint/model/voice against current DashScope docs (Task 3.5 Step 1).
pub async fn synthesize(api_key: &str, text: &str) -> Result<Vec<u8>, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post("https://dashscope.aliyuncs.com/api/v1/services/aigc/text2speech/speech-synthesizer")
        .bearer_auth(api_key)
        .json(&serde_json::json!({
            "model": "cosyvoice-v1",
            "input": { "text": text },
            "parameters": { "voice": "longxiaochun", "format": "mp3" }
        }))
        .send()
        .await
        .map_err(|e| format!("tts request failed: {e}"))?;
    let bytes = resp.bytes().await.map_err(|e| format!("tts read failed: {e}"))?;
    Ok(bytes.to_vec())
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd src-tauri && cargo build 2>&1 | tail -5; cd ..`
Expected: builds.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/bailian/tts.rs && git commit -m "feat: bailian cosyvoice tts synthesis"
```

### Task 3.6: Tauri commands exposing the pipeline

**Files:**
- Create: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/main.rs` (register commands)

- [ ] **Step 1: Implement `src-tauri/src/commands.rs`**

```rust
use crate::{bailian, keystore};

#[tauri::command]
pub async fn infer_animal(transcript: String) -> Result<String, String> {
    bailian::llm::infer_animal(&keystore::api_key(), &transcript).await
}

#[tauri::command]
pub async fn transcribe(wav: Vec<u8>) -> Result<String, String> {
    bailian::asr::transcribe(&keystore::api_key(), &wav).await
}

#[tauri::command]
pub async fn synthesize(text: String) -> Result<Vec<u8>, String> {
    bailian::tts::synthesize(&keystore::api_key(), &text).await
}

/// LLM fallback for ambiguous transcripts during the awaiting phase.
/// Returns "try_again", "confirm", or "unknown".
#[tauri::command]
pub async fn classify_command(transcript: String) -> Result<String, String> {
    let key = keystore::api_key();
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": "qwen-plus",
        "temperature": 0,
        "messages": [
            { "role": "system", "content":
              "A child is playing a guessing game. Classify their utterance as exactly one word: \
               'confirm' (they agree the guess is right, e.g. yes it is), \
               'try_again' (they want another guess, e.g. try guessing again), \
               or 'unknown'. Reply with only that one word." },
            { "role": "user", "content": transcript }
        ]
    });
    let resp = client
        .post("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions")
        .bearer_auth(&key).json(&body).send().await
        .map_err(|e| format!("classify failed: {e}"))?;
    let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let word = v["choices"][0]["message"]["content"].as_str().unwrap_or("unknown")
        .to_lowercase();
    let out = if word.contains("confirm") { "confirm" }
        else if word.contains("try") { "try_again" } else { "unknown" };
    Ok(out.to_string())
}
```

- [ ] **Step 2: Register in `src-tauri/src/main.rs`**

Add `mod commands;` and in the builder:
```rust
.invoke_handler(tauri::generate_handler![
    commands::infer_animal,
    commands::transcribe,
    commands::synthesize,
    commands::classify_command,
])
```
Add `reqwest` use where needed (already a dependency).

- [ ] **Step 3: Manual end-to-end network check**

Run: `cd src-tauri && BAILIAN_API_KEY=sk-REAL_KEY cargo build 2>&1 | tail -5; cd ..`
Then add a temporary `#[tokio::test]` (ignored by default) that calls `infer_animal` with "It's big it has a long nose" and asserts "Elephant". Run with the real key:
`cd src-tauri && BAILIAN_API_KEY=sk-REAL_KEY cargo test --ignored bailian 2>&1 | tail; cd ..`
Expected: returns "Elephant". Remove the temporary test afterward. **Do not commit the real key.**

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands.rs src-tauri/src/main.rs
git commit -m "feat: tauri commands for asr/inference/tts/classify"
```

---

## Phase 4 — Audio capture + VAD (frontend)

### Task 4.1: Energy VAD recorder controller

**Files:**
- Create: `src/voice/vad.ts`
- Test: `src/voice/vad.test.ts`

- [ ] **Step 1: Write the failing test `src/voice/vad.test.ts`** (pure silence-detection logic)

```ts
import { expect, test } from "vitest";
import { SilenceDetector } from "./vad";

test("fires done after enough trailing silence following speech", () => {
  const d = new SilenceDetector({ speechThreshold: 0.05, silenceMs: 300, frameMs: 100 });
  // speech frames
  expect(d.push(0.2)).toBe(false);
  expect(d.push(0.2)).toBe(false);
  // silence frames: 100,200,300ms
  expect(d.push(0.0)).toBe(false);
  expect(d.push(0.0)).toBe(false);
  expect(d.push(0.0)).toBe(true); // 300ms of silence reached -> done
});

test("does not fire if speech never started", () => {
  const d = new SilenceDetector({ speechThreshold: 0.05, silenceMs: 300, frameMs: 100 });
  expect(d.push(0.0)).toBe(false);
  expect(d.push(0.0)).toBe(false);
  expect(d.push(0.0)).toBe(false);
  expect(d.push(0.0)).toBe(false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- vad`
Expected: FAIL — cannot find module `./vad`.

- [ ] **Step 3: Implement `src/voice/vad.ts`**

```ts
export interface VadOpts { speechThreshold: number; silenceMs: number; frameMs: number; }

/** Pure decision logic: feed per-frame RMS energy, returns true when the utterance is done. */
export class SilenceDetector {
  private started = false;
  private silentMs = 0;
  constructor(private opts: VadOpts) {}

  push(rms: number): boolean {
    if (rms >= this.opts.speechThreshold) {
      this.started = true;
      this.silentMs = 0;
      return false;
    }
    if (!this.started) return false;
    this.silentMs += this.opts.frameMs;
    return this.silentMs >= this.opts.silenceMs;
  }
}

/** Captures mic audio, auto-stops on trailing silence, resolves with Float32 PCM @ ctx rate. */
export async function recordUtterance(opts: VadOpts = { speechThreshold: 0.02, silenceMs: 900, frameMs: 50 }): Promise<{ samples: Float32Array; sampleRate: number }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const frameSize = Math.round((ctx.sampleRate * opts.frameMs) / 1000);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const det = new SilenceDetector(opts);
  const chunks: Float32Array[] = [];

  return new Promise((resolve) => {
    let buffer: number[] = [];
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(input));
      buffer.push(...input);
      while (buffer.length >= frameSize) {
        const frame = buffer.splice(0, frameSize);
        let sum = 0;
        for (const v of frame) sum += v * v;
        const rms = Math.sqrt(sum / frame.length);
        if (det.push(rms)) {
          processor.disconnect();
          source.disconnect();
          stream.getTracks().forEach((t) => t.stop());
          const total = chunks.reduce((n, c) => n + c.length, 0);
          const out = new Float32Array(total);
          let off = 0;
          for (const c of chunks) { out.set(c, off); off += c.length; }
          const sr = ctx.sampleRate;
          ctx.close();
          resolve({ samples: out, sampleRate: sr });
          return;
        }
      }
    };
    source.connect(processor);
    processor.connect(ctx.destination);
  });
}
```

> The pure `SilenceDetector` is unit-tested. `recordUtterance` (browser-only Web Audio glue) is verified manually in Task 7. Downsampling to 16k is done by `encodeWav` callers resampling if `sampleRate !== 16000`; add a `resampleTo16k` helper in Task 4.2.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- vad`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/voice/vad.ts src/voice/vad.test.ts
git commit -m "feat: energy VAD + utterance recorder with tests"
```

### Task 4.2: Resample-to-16k helper (TDD)

**Files:**
- Modify: `src/voice/wav.ts`
- Test: `src/voice/wav.test.ts` (add cases)

- [ ] **Step 1: Add failing test cases to `src/voice/wav.test.ts`**

```ts
import { resampleTo16k } from "./wav";

test("resampleTo16k halves a 32k signal length (approx)", () => {
  const input = new Float32Array(3200); // 0.1s @ 32k
  const out = resampleTo16k(input, 32000);
  expect(out.length).toBe(1600);
});

test("resampleTo16k is a no-op at 16k", () => {
  const input = new Float32Array([0.1, 0.2, 0.3]);
  expect(resampleTo16k(input, 16000)).toBe(input);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- wav`
Expected: FAIL — `resampleTo16k` is not exported.

- [ ] **Step 3: Add `resampleTo16k` to `src/voice/wav.ts`**

```ts
/** Linear-interpolation downsample to 16kHz. Returns input unchanged if already 16k. */
export function resampleTo16k(samples: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === 16000) return samples;
  const ratio = sampleRate / 16000;
  const outLen = Math.round(samples.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, samples.length - 1);
    const frac = pos - i0;
    out[i] = samples[i0] * (1 - frac) + samples[i1] * frac;
  }
  return out;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- wav`
Expected: all wav tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/voice/wav.ts src/voice/wav.test.ts
git commit -m "feat: 16k resample helper with tests"
```

### Task 4.3: Bailian frontend bridge

**Files:**
- Create: `src/voice/bailian.ts`

- [ ] **Step 1: Implement thin invoke wrappers**

```ts
import { invoke } from "@tauri-apps/api/core";
import { recordUtterance } from "./vad";
import { encodeWav, resampleTo16k } from "./wav";

export async function listenAndTranscribe(): Promise<string> {
  const { samples, sampleRate } = await recordUtterance();
  const wav = encodeWav(resampleTo16k(samples, sampleRate), 16000);
  return invoke<string>("transcribe", { wav: Array.from(new Uint8Array(wav)) });
}

export function inferAnimal(transcript: string): Promise<string> {
  return invoke<string>("infer_animal", { transcript });
}

export function classifyCommand(transcript: string): Promise<string> {
  return invoke<string>("classify_command", { transcript });
}

export async function speak(text: string): Promise<void> {
  const bytes = await invoke<number[]>("synthesize", { text });
  const blob = new Blob([new Uint8Array(bytes)], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await audio.play();
  await new Promise<void>((res) => { audio.onended = () => res(); });
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/voice/bailian.ts && git commit -m "feat: frontend bailian bridge (listen/infer/classify/speak)"
```

---

## Phase 5 — Memphis UI (Bubblegum Pop)

### Task 5.1: Design tokens and Memphis primitives

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`
- Modify: `src/main.tsx` (import both)

- [ ] **Step 1: Write `src/styles/tokens.css`**

```css
:root {
  /* Bubblegum Pop */
  --base: #FDE7F0;
  --pink: #E84B8A;
  --yellow: #FFD23F;
  --sky: #7BD3EA;
  --mint: #A0E7A0;
  --lavender: #C3A6FF;
  --coral: #FF6B6B;
  --ink: #222222;

  --radius: 24px;
  --shadow-hard: 6px 6px 0 var(--ink);
  --border: 4px solid var(--ink);
  --font-display: "Baloo 2", "Comic Sans MS", system-ui, sans-serif;
}
```

- [ ] **Step 2: Write `src/styles/global.css`**

```css
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body {
  font-family: var(--font-display);
  background: var(--base);
  color: var(--ink);
  overflow: hidden;            /* kiosk: no scroll */
  -webkit-user-select: none; user-select: none;
}
.screen { position: relative; height: 100vh; width: 100vw; overflow: hidden; }

.btn-pop {
  font-family: var(--font-display); font-weight: 800; font-size: 1.5rem;
  border: var(--border); border-radius: 999px; padding: 1rem 2.5rem;
  background: var(--coral); color: #fff; box-shadow: var(--shadow-hard);
  cursor: pointer; transition: transform .08s;
}
.btn-pop:active { transform: translate(3px, 3px); box-shadow: 3px 3px 0 var(--ink); }

.bubble {
  background: #fff; border: var(--border); border-radius: 20px;
  padding: 0.9rem 1.2rem; font-weight: 700; box-shadow: 4px 4px 0 var(--ink);
}
.bubble.ai { background: var(--yellow); }
.bubble.kid { background: var(--sky); }

@keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
@keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(255,107,107,.5) } 100% { box-shadow: 0 0 0 28px rgba(255,107,107,0) } }
@keyframes pop-in { 0% { transform: scale(0) rotate(-12deg) } 70% { transform: scale(1.1) } 100% { transform: scale(1) rotate(0) } }
```

- [ ] **Step 3: Import in `src/main.tsx`**

Add: `import "./styles/tokens.css"; import "./styles/global.css";`
Also add the Baloo 2 font link to `index.html` `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&display=swap" rel="stylesheet">
```

- [ ] **Step 4: Commit**

```bash
git add src/styles src/main.tsx index.html
git commit -m "feat: bubblegum pop design tokens and memphis primitives"
```

### Task 5.2: MemphisBackground component

**Files:**
- Create: `src/components/MemphisBackground.tsx`

- [ ] **Step 1: Implement**

```tsx
const SHAPES = [
  { type: "circle",   top: "8%",  left: "6%",  color: "var(--yellow)",   size: 44 },
  { type: "triangle", top: "14%", left: "88%", color: "var(--sky)",      size: 36 },
  { type: "square",   top: "70%", left: "4%",  color: "var(--lavender)", size: 30 },
  { type: "circle",   top: "80%", left: "92%", color: "var(--mint)",     size: 26 },
  { type: "zigzag",   top: "55%", left: "90%", color: "var(--coral)",    size: 40 },
  { type: "dot",      top: "40%", left: "12%", color: "var(--pink)",     size: 16 },
];

export function MemphisBackground() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {SHAPES.map((s, i) => {
        const base = { position: "absolute" as const, top: s.top, left: s.left, animation: `float ${3 + (i % 3)}s ease-in-out infinite` };
        if (s.type === "circle" || s.type === "dot")
          return <div key={i} style={{ ...base, width: s.size, height: s.size, borderRadius: "50%", background: s.color }} />;
        if (s.type === "square")
          return <div key={i} style={{ ...base, width: s.size, height: s.size, background: s.color, transform: "rotate(18deg)" }} />;
        if (s.type === "triangle")
          return <div key={i} style={{ ...base, width: 0, height: 0, borderLeft: `${s.size/2}px solid transparent`, borderRight: `${s.size/2}px solid transparent`, borderBottom: `${s.size}px solid ${s.color}` }} />;
        // zigzag
        return <div key={i} style={{ ...base, width: s.size, height: s.size*0.4, color: s.color,
          background: "repeating-linear-gradient(135deg, currentColor 0 3px, transparent 3px 8px)" }} />;
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck & commit**

Run: `npx tsc --noEmit` (expect no errors)
```bash
git add src/components/MemphisBackground.tsx
git commit -m "feat: scattered memphis background shapes"
```

### Task 5.3: Mascot, SpeechBubble, ListeningOrb, AnimalCard

**Files:**
- Create: `src/components/Mascot.tsx`, `src/components/SpeechBubble.tsx`, `src/components/ListeningOrb.tsx`, `src/components/AnimalCard.tsx`

- [ ] **Step 1: `src/components/Mascot.tsx`**

```tsx
type MascotState = "idle" | "listening" | "thinking" | "talking" | "celebrating";
const FACE: Record<MascotState, string> = { idle: "🤖", listening: "👂", thinking: "🤔", talking: "🗣️", celebrating: "🥳" };

export function Mascot({ state, size = 120 }: { state: MascotState; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "var(--yellow)",
      border: "var(--border)", boxShadow: "var(--shadow-hard)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.5, animation: state === "talking" ? "float .5s ease-in-out infinite" : "float 3s ease-in-out infinite",
    }}>{FACE[state]}</div>
  );
}
export type { MascotState };
```

- [ ] **Step 2: `src/components/SpeechBubble.tsx`**

```tsx
export function SpeechBubble({ who, children }: { who: "ai" | "kid"; children: React.ReactNode }) {
  return <div className={`bubble ${who}`} style={{ animation: "pop-in .25s ease-out", maxWidth: 520 }}>{children}</div>;
}
```

- [ ] **Step 3: `src/components/ListeningOrb.tsx`**

```tsx
export function ListeningOrb({ active, label }: { active: boolean; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 96, height: 96, borderRadius: "50%", background: "var(--coral)", border: "var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40,
        animation: active ? "pulse-ring 1.2s ease-out infinite" : "none",
      }}>🎤</div>
      <div style={{ fontWeight: 800 }}>{label}</div>
    </div>
  );
}
```

- [ ] **Step 4: `src/components/AnimalCard.tsx`**

```tsx
import type { Animal } from "../game/types";

export function AnimalCard({ animal, onPick }: { animal: Animal; onPick: (a: Animal) => void }) {
  return (
    <button onClick={() => onPick(animal)} style={{
      border: "var(--border)", borderRadius: "var(--radius)", background: "#fff",
      boxShadow: "var(--shadow-hard)", padding: 0, cursor: "pointer", overflow: "hidden",
    }}>
      <img src={`/animals/${animal.id}.png`} alt={animal.name}
           style={{ width: 180, height: 140, objectFit: "cover", display: "block" }}
           onError={(e) => { (e.currentTarget.style.display = "none"); }} />
      <div style={{ fontWeight: 800, fontSize: 22, padding: "8px 0" }}>{animal.emoji} {animal.name}</div>
    </button>
  );
}
```

- [ ] **Step 5: Typecheck & commit**

Run: `npx tsc --noEmit`
```bash
git add src/components
git commit -m "feat: mascot, speech bubble, listening orb, animal card components"
```

### Task 5.4: The four screens (presentational)

**Files:**
- Create: `src/screens/AttractScreen.tsx`, `src/screens/PickScreen.tsx`, `src/screens/PlayScreen.tsx`, `src/screens/CelebrationScreen.tsx`

- [ ] **Step 1: `src/screens/AttractScreen.tsx`**

```tsx
import { MemphisBackground } from "../components/MemphisBackground";
import { Mascot } from "../components/Mascot";

export function AttractScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="screen" style={{ display: "grid", placeItems: "center" }}>
      <MemphisBackground />
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <h1 style={{ color: "var(--pink)", fontSize: "3.5rem", margin: 0 }}>Guess the Animal!</h1>
        <div style={{ display: "grid", placeItems: "center", margin: "1.5rem 0" }}><Mascot state="idle" size={160} /></div>
        <button className="btn-pop" onClick={onStart}>Tap to start ✨</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `src/screens/PickScreen.tsx`**

```tsx
import { MemphisBackground } from "../components/MemphisBackground";
import { AnimalCard } from "../components/AnimalCard";
import { ANIMALS } from "../game/animals";
import type { Animal } from "../game/types";

export function PickScreen({ onPick }: { onPick: (a: Animal) => void }) {
  return (
    <div className="screen" style={{ display: "grid", placeItems: "center" }}>
      <MemphisBackground />
      <div style={{ zIndex: 1, textAlign: "center" }}>
        <h2 style={{ color: "var(--pink)" }}>Pick an animal to describe 🐾</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 16 }}>
          {ANIMALS.map((a) => <AnimalCard key={a.id} animal={a} onPick={onPick} />)}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `src/screens/PlayScreen.tsx`** (Big Stage)

```tsx
import { MemphisBackground } from "../components/MemphisBackground";
import { Mascot, type MascotState } from "../components/Mascot";
import { SpeechBubble } from "../components/SpeechBubble";
import { ListeningOrb } from "../components/ListeningOrb";
import type { Animal } from "../game/types";

export function PlayScreen(props: {
  target: Animal;
  mascot: MascotState;
  aiLine: string | null;     // current Bibo guess/line
  kidLine: string | null;    // last transcript
  orbActive: boolean;
  orbLabel: string;
}) {
  const { target, mascot, aiLine, kidLine, orbActive, orbLabel } = props;
  return (
    <div className="screen">
      <MemphisBackground />
      <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", textAlign: "center", zIndex: 1 }}>
        <div style={{ fontWeight: 800, opacity: .6, fontSize: 12, letterSpacing: 1 }}>DESCRIBING</div>
        <div style={{ fontSize: 48 }}>{target.emoji}</div>
      </div>
      <div style={{ position: "absolute", top: 150, left: 40, display: "flex", gap: 24, alignItems: "flex-start", zIndex: 1 }}>
        <Mascot state={mascot} />
        {aiLine && <div style={{ marginTop: 12 }}><div style={{ fontWeight: 800, opacity: .6, fontSize: 12 }}>BIBO GUESSES</div><SpeechBubble who="ai">{aiLine}</SpeechBubble></div>}
      </div>
      {kidLine && (
        <div style={{ position: "absolute", top: 300, left: 24, zIndex: 1 }}>
          <div style={{ fontWeight: 800, opacity: .6, fontSize: 12 }}>YOU SAID</div>
          <SpeechBubble who="kid">{kidLine}</SpeechBubble>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, display: "grid", placeItems: "center", zIndex: 1 }}>
        <ListeningOrb active={orbActive} label={orbLabel} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `src/screens/CelebrationScreen.tsx`**

```tsx
import { useEffect } from "react";
import confetti from "canvas-confetti";
import type { Animal } from "../game/types";

export function CelebrationScreen({ animal, onDone }: { animal: Animal; onDone: () => void }) {
  useEffect(() => {
    confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
    const t = setTimeout(onDone, 6000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="screen" onClick={onDone} style={{ display: "grid", placeItems: "center", background: "var(--mint)" }}>
      <div style={{ textAlign: "center", animation: "pop-in .4s ease-out" }}>
        <img src={`/animals/${animal.id}.png`} alt={animal.name}
             style={{ width: 360, borderRadius: 24, border: "var(--border)", boxShadow: "var(--shadow-hard)" }}
             onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement("div"), { textContent: animal.emoji, style: "font-size:200px" })); }} />
        <h1 style={{ color: "var(--pink)", fontSize: "3rem" }}>Yes! It's a {animal.name}! 🎉</h1>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Install confetti, typecheck, commit**

Run: `npm install canvas-confetti && npm install -D @types/canvas-confetti && npx tsc --noEmit`
```bash
git add src/screens package.json package-lock.json
git commit -m "feat: attract/pick/play/celebration screens"
```

---

## Phase 6 — Pre-generate the 9 animal images

### Task 6.1: Generate and bundle 9 Memphis-style scenes

**Files:**
- Create: `assets/animals/<id>.png` (9 files), `scripts/generate-images.md`, copy into `public/animals/`

- [ ] **Step 1: Write `scripts/generate-images.md`** documenting the prompt + model

```md
# Animal scene images (pre-generated once)

Model: Bailian/DashScope image generation (e.g. wanx-v1 / qwen-image). Run once with the API key in env.

Prompt template (per animal):
"Cute <ANIMAL>, Memphis design illustration, pastel pink background #FDE7F0,
scattered geometric shapes (circles, zigzags, triangles), bold black outlines,
flat vector, playful children's exhibition style, centered, square."

Save each result as assets/animals/<id>.png at ~800x800, then copy to public/animals/.
Filenames (ids): monkey, kangaroo, elephant, turtle, tiger, crab, bird, snake, spider.
```

- [ ] **Step 2: Generate the 9 images**

Using the Bailian image API (or the console) with the prompt template, produce 9 square PNGs and save to `assets/animals/`. Verify each is on-style and clearly the right animal.

- [ ] **Step 3: Copy into the served folder**

Run: `mkdir -p public/animals && cp assets/animals/*.png public/animals/`
(Vite serves `public/` at root, so `/animals/elephant.png` resolves; Tauri bundles `public/` via the dist build.)

- [ ] **Step 4: Commit**

```bash
git add assets/animals public/animals scripts/generate-images.md
git commit -m "assets: 9 pre-generated memphis animal scenes"
```

---

## Phase 7 — Integration: wire UI ↔ engine ↔ voice

### Task 7.1: App orchestrator

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement the orchestrator**

```tsx
import { useEffect, useReducer, useRef, useState } from "react";
import { initialState, reduce, type GameState } from "./game/machine";
import { planGuessSequence } from "./game/guessing";
import { matchCommand } from "./game/commands";
import { animalByName } from "./game/animals";
import type { Animal } from "./game/types";
import { listenAndTranscribe, inferAnimal, classifyCommand, speak } from "./voice/bailian";
import { AttractScreen } from "./screens/AttractScreen";
import { PickScreen } from "./screens/PickScreen";
import { PlayScreen } from "./screens/PlayScreen";
import { CelebrationScreen } from "./screens/CelebrationScreen";
import type { MascotState } from "./components/Mascot";

export default function App() {
  // useReducer wants (state, action) => state; our reduce returns state+currentGuess (a superset), which is fine.
  const [state, dispatch] = useReducer(reduce as any, initialState() as any) as [
    GameState & { currentGuess: Animal | null }, (a: any) => void
  ];
  const [kidLine, setKidLine] = useState<string | null>(null);
  const [aiLine, setAiLine] = useState<string | null>(null);
  const [mascot, setMascot] = useState<MascotState>("idle");
  const busy = useRef(false);

  // Drive side effects off phase transitions.
  useEffect(() => {
    if (state.phase === "listening" && !busy.current) {
      busy.current = true;
      setMascot("listening");
      (async () => {
        const transcript = await listenAndTranscribe();
        setKidLine(transcript);
        busy.current = false;
        dispatch({ type: "UTTERANCE_CAPTURED", transcript });
      })();
    }

    if (state.phase === "thinking" && !busy.current) {
      busy.current = true;
      setMascot("thinking");
      (async () => {
        let target = state.target!;
        try {
          const inferred = await inferAnimal(state.transcript);
          target = animalByName(inferred) ?? state.target!;
        } catch { /* fall back to the picked card */ }
        const plan = planGuessSequence(target);
        busy.current = false;
        dispatch({ type: "PLAN_READY", plan });
      })();
    }

    if (state.phase === "guessing" && !busy.current) {
      busy.current = true;
      const guess = state.currentGuess!;
      const isLast = state.guessIndex === state.plan.length - 1;
      const line = isLast ? `Then it must be a ${guess.name}! ${guess.emoji}` : `Hmm… is it a ${guess.name}? ${guess.emoji}`;
      setAiLine(line);
      setMascot("talking");
      (async () => {
        await speak(line);
        setMascot("idle");
        busy.current = false;
        dispatch({ type: "GUESS_SPOKEN" });
      })();
    }

    if (state.phase === "awaiting" && !busy.current) {
      busy.current = true;
      setMascot("listening");
      (async () => {
        const transcript = await listenAndTranscribe();
        setKidLine(transcript);
        let cmd = matchCommand(transcript);
        if (cmd === "unknown") cmd = (await classifyCommand(transcript)) as any;
        busy.current = false;
        dispatch({ type: "COMMAND", command: cmd });
      })();
    }
  }, [state.phase, state.guessIndex]);

  switch (state.phase) {
    case "attract":
      return <AttractScreen onStart={() => { setKidLine(null); setAiLine(null); dispatch({ type: "START" }); }} />;
    case "picking":
      return <PickScreen onPick={(a) => dispatch({ type: "PICK", animal: a })} />;
    case "celebrating":
      return <CelebrationScreen animal={state.target!} onDone={() => dispatch({ type: "RESET" })} />;
    default:
      return (
        <PlayScreen
          target={state.target!}
          mascot={mascot}
          aiLine={aiLine}
          kidLine={kidLine}
          orbActive={mascot === "listening"}
          orbLabel={mascot === "listening" ? "I'm listening…" : mascot === "thinking" ? "Bibo is thinking…" : "Bibo is talking…"}
        />
      );
  }
}
```

> The `as any` casts bridge `useReducer`'s `(S,A)=>S` signature with our enriched return type; the runtime behavior is correct and the pure reducer remains fully tested in Task 2.4.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual run-through (desktop)**

Run: `BAILIAN_API_KEY=sk-REAL_KEY npx tauri dev`
Walk the full loop: start → pick Elephant → say "It's big, it has a long nose" → hear a wrong guess → say "try guessing again" → hear "Elephant" → say "yes it is" → confetti. Note any failures for fixing before commit.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx && git commit -m "feat: wire full game loop (ui + engine + voice)"
```

### Task 7.2: Microphone permission in Tauri

**Files:**
- Modify: `src-tauri/tauri.conf.json`, `src-tauri/capabilities/*.json`, macOS `Info.plist` entitlement

- [ ] **Step 1: Add macOS mic usage description**

In `src-tauri/tauri.conf.json` under `bundle.macOS`, add an `Info.plist` entry / or create `src-tauri/Info.plist` with:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Guess the Animal listens so children can describe animals out loud.</string>
```

- [ ] **Step 2: Android mic permission**

Ensure `src-tauri/gen/android/.../AndroidManifest.xml` includes:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```
(Regenerate android project in Task 8 if not yet present, then add.)

- [ ] **Step 3: Verify mic prompt appears**

Run: `BAILIAN_API_KEY=sk-REAL_KEY npx tauri dev` and confirm the OS asks for mic access on first listen.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/tauri.conf.json src-tauri/Info.plist
git commit -m "chore: declare microphone permission"
```

---

## Phase 8 — Packaging to .dmg / .exe / .apk

### Task 8.1: Desktop builds (.dmg on macOS, .exe on Windows)

- [ ] **Step 1: Build with the key in the environment**

On macOS: `BAILIAN_API_KEY=sk-REAL_KEY npx tauri build`
Expected: a `.dmg` (and `.app`) under `src-tauri/target/release/bundle/`.
On Windows (separate machine/CI): `set BAILIAN_API_KEY=sk-REAL_KEY && npx tauri build`
Expected: an `.exe`/`.msi` under `src-tauri/target/release/bundle/`.

- [ ] **Step 2: Verify the key is not in the JS bundle**

Run: `grep -r "sk-" dist/ || echo "no key in dist (good)"`
Expected: "no key in dist (good)".

- [ ] **Step 3: Smoke-test the built app**

Open the built app on a clean machine (no env var set) and run the full loop. The key is baked into the binary, so it works without any environment.

### Task 8.2: Android build (.apk)

- [ ] **Step 1: Initialize the Android target**

Run: `npx tauri android init`
Ensure Android SDK/NDK + Java are installed per Tauri v2 mobile docs. Add the mic/internet permissions from Task 7.2 Step 2.

- [ ] **Step 2: Build the APK**

Run: `BAILIAN_API_KEY=sk-REAL_KEY npx tauri android build --apk`
Expected: a `.apk` under `src-tauri/gen/android/app/build/outputs/`.

- [ ] **Step 3: Install and smoke-test on a device/tablet**

Run: `adb install <path-to-apk>` then open and run the full loop. Confirm mic permission prompt and voice flow work.

### Task 8.3: Release notes

**Files:**
- Create: `README.md` (build + run instructions)

- [ ] **Step 1: Write `README.md`** covering: prerequisites, how to set `BAILIAN_API_KEY` for a build, the three build commands, and the note that distributed binaries contain the obfuscated key (best-effort).

- [ ] **Step 2: Commit**

```bash
git add README.md && git commit -m "docs: build and packaging instructions"
```

---

## Self-Review (completed)

- **Spec coverage:** 9 animals (2.1), hands-free voice/VAD (4.1), genuine inference constrained to 9 (3.1/7.1), deterministic wrong-then-right (2.2/2.4), command detection + LLM fallback (2.3/3.6/7.1), CosyVoice TTS (3.5), Memphis Bubblegum Pop UI + Big Stage + 4 screens (5.x), pre-generated images (6.1), Tauri v2 → dmg/exe/apk (8.x), key out of JS bundle via build.rs obfuscation (1.x, verified 8.1 Step 2). All covered.
- **Placeholder scan:** No "TBD/implement later" steps; the ASR/TTS doc-verification steps (3.4/3.5 Step 1) are explicit verification actions with concrete fallback code, not placeholders.
- **Type consistency:** `Animal`/`Phase`/`Command` defined once (2.1) and reused; `reduce`/`initialState`/`planGuessSequence`/`matchCommand`/`encodeWav`/`resampleTo16k`/`SilenceDetector` names match across tasks; Tauri command names (`infer_animal`, `transcribe`, `synthesize`, `classify_command`) match between 3.6 and the frontend bridge (4.3) and orchestrator (7.1).

## Known Risks

- **DashScope ASR/TTS request shapes** may differ from the code in 3.4/3.5; Step 1 of each task verifies against current docs. Isolated to one function each.
- **Child-speech ASR accuracy** in a noisy room — mitigated by inference being constrained to the 9 animals and falling back to the picked card if inference fails (7.1).
- **Tauri v2 Android tooling** maturity — Task 8.2 may need SDK/NDK setup iteration.
