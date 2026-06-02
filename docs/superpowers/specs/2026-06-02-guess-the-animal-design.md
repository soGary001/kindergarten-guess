# Guess the Animal — Design Spec

**Date:** 2026-06-02
**Status:** Approved (design phase)

## Overview

A hands-free voice play station for an international kindergarten English oral
exhibition. A child describes one of 9 animals using 2-3 short English phrases.
An AI mascot ("Bibo", placeholder name) genuinely infers the answer, then
deliberately guesses **wrong 1-2 times** to train the child's listening before
landing the correct answer on cue. The child confirms, and a celebration plays.

The app is packaged as `.dmg`, `.exe`, and `.apk` from a single codebase so it
can be transferred to and run on other machines without per-machine setup.

## Goals

- A repeatable, hands-free, voice-driven guessing game that is fun and
  eye-catching at an exhibition booth.
- The AI infers the animal from the child's spoken description (genuine
  inference), made reliable by constraining inference to the 9 known animals.
- Pedagogically deliberate: the AI gives 1-2 plausible-but-wrong guesses first,
  advancing to the correct answer only after the child says "Try guessing again."
- One codebase ships to Windows, macOS, and Android.
- The API key is not present in the distributed JavaScript bundle.

## Non-Goals (explicitly out of scope — YAGNI)

- No login, user accounts, or contestant management.
- No scoring, ranking, or leaderboard.
- No live/runtime image generation.
- No teacher/operator control panel or manual overrides.
- No support for animals outside the fixed list of 9.

## The 9 Animals

The fixed content set. The hint phrases are reference material (the kind of
description a child is expected to give), not a script the app reads aloud.

| # | Hint phrases (reference)                       | Answer    |
|---|------------------------------------------------|-----------|
| 1 | It likes banana. It has a long tail.           | Monkey    |
| 2 | It has a pouch. It hops.                        | Kangaroo  |
| 3 | It's big. It has a trunk.                       | Elephant  |
| 4 | It crawls. It has a shell.                      | Turtle    |
| 5 | It eats meat. It has stripes on its body.       | Tiger     |
| 6 | It has claws. It lives in the sea.             | Crab      |
| 7 | It has a beak. It likes to eat seeds.          | Bird      |
| 8 | It slithers. It lives in the hole.             | Snake     |
| 9 | It has 8 legs. It makes a web.                 | Spider    |

## User Experience

### Screens

1. **Attract / Home** — Playful title ("Guess the Animal!"), animated mascot,
   scattered Memphis shapes, a big "Tap to start" button. Idles here between
   children.
2. **Pick** — 9 face-up animal cards (the pre-generated scene images). The child
   taps the animal they want to describe.
3. **Play (Big Stage layout)** — The core screen. Large expressive mascot
   ("Bibo") center-stage, a speech bubble for Bibo's current line, a bubble
   showing the child's transcribed words, a small thumbnail of the chosen animal
   ("describing 🐘"), and a large glowing listening orb at the bottom with state
   labels ("I'm listening…" / "Bibo is thinking…" / "Bibo is talking…").
4. **Celebration** — Triggered on "Yes, it is!". Big animated reveal of the
   animal scene, confetti, a happy sound, a short congratulatory line from Bibo.
   Auto-returns to Attract after a few seconds (or on tap).

### Core interaction loop

1. Child taps to start → picks an animal.
2. On the Play screen, the child speaks 2-3 phrases hands-free.
3. The app detects end-of-speech (VAD), transcribes via streaming ASR, and the
   LLM infers which of the 9 animals it is.
4. The game engine has Bibo voice a **plausible-but-wrong** guess
   (e.g. "Hmm… is it a snake?").
5. Child says **"Try guessing again."** → Bibo gives the next guess: either one
   more wrong guess (max 2 wrong total) or the correct one.
6. When Bibo voices the **correct** animal, the child confirms
   **"Yes, it is!"** → Celebration.
7. Auto-return to Attract for the next child.

### Turn-taking / robustness

- Hands-free: no push-to-talk button. The app continuously listens during the
  child's turn and uses voice-activity detection to decide when the child has
  finished speaking.
- Inference is constrained to the 9 animals, so imperfect child pronunciation or
  partial descriptions still resolve to the nearest valid animal.
- Command phrases ("Try guessing again", "Yes, it is") are matched on the
  transcript with fuzzy matching plus an LLM intent-classification fallback, so
  near-miss phrasings ("try again", "yes!") still advance the game.

## Voice Pipeline (controlled)

A controlled pipeline is used rather than a single autonomous voice model, so
the deliberate wrong-then-right pedagogy is guaranteed and the on-screen
transcript is easy to render.

- **ASR:** Alibaba Cloud Bailian (DashScope) real-time speech recognition over
  **WebSocket** (`paraformer-realtime-v2`). The frontend does voice-activity
  detection to bound each utterance, then the Rust core streams that utterance's
  audio frames to the ASR WebSocket and collects the transcript. (DashScope's
  recorded-file REST API is async and requires a public file URL, so it is not
  used for live booth interaction.)
- **Inference:** Qwen LLM, prompted with the fixed list of 9 animals and asked
  to return the single best match for the child's description.
- **Game engine:** Deterministically selects 1-2 wrong animals from the other 8
  (chosen to be plausible but clearly different). The LLM is used only to phrase
  guesses and reactions naturally for a young child; it does not control game
  state or the wrong/right sequence.
- **Command detection:** Transcript-based intent matching for "Try guessing
  again" and "Yes, it is", with fuzzy + LLM fallback.
- **TTS:** Bailian CosyVoice over **WebSocket** (`cosyvoice-v2`; CosyVoice is
  WebSocket-only — HTTP POST is rejected). A cheerful, kid-friendly,
  English-capable voice; audio returns as binary frames the webview plays.
- **Resilience:** Every voice phase has error handling and a watchdog timeout.
  Any network/mic/ASR/TTS failure or a stretch of unrecognized input resets the
  booth to the attract screen so it never freezes unattended.

**Connectivity:** The voice pipeline requires internet access to Bailian. The 9
animal images are bundled and work offline; only voice interaction needs the
network.

## Visual Design

- **Style:** Memphis design — pastel base with scattered geometric shapes
  (circles, zigzags, triangles, dots), bold black outlines, offset hard shadows.
  Playful, cute, high-dopamine, with large touch targets for small hands.
- **Palette — "Bubblegum Pop":**
  - Base: `#FDE7F0` (soft pink)
  - Accents: `#E84B8A` (magenta-pink), `#FFD23F` (sunny yellow),
    `#7BD3EA` (sky), `#A0E7A0` (mint), `#C3A6FF` (lavender), `#FF6B6B` (coral)
- **Play layout:** "Big Stage" — large expressive mascot center-stage, big
  glowing listening orb, speech bubbles with black borders and offset shadows.
- **Mascot:** "Bibo" (placeholder name; trivially renameable). Has visible states:
  listening, thinking, talking, celebrating.

## Technical Architecture

### Stack & packaging

- **Tauri v2** — single project targeting desktop and mobile, producing
  `.dmg` (macOS), `.exe` (Windows), and `.apk` (Android).
- **Frontend:** Web app built with Vite (rich Memphis visuals and animations in
  HTML/CSS/JS). Framework choice (React/Vue/vanilla) to be finalized in the
  implementation plan; it does not affect this design.
- **Rust core (Tauri backend):** Holds the obfuscated API key and performs all
  Bailian calls (ASR stream relay, LLM, TTS). The key is never present in the
  JavaScript bundle.

### API key handling

- The key is embedded in the compiled Rust core in obfuscated form, not as
  plaintext, and not in the web/JS layer.
- This is **best-effort** protection consistent with the convenience priority:
  it keeps the key out of the shipped JS and resists casual inspection, but a
  determined attacker with the binary could still extract it. Acceptable for a
  kindergarten exhibition threat model.

### Assets

- The 9 animal scene images are generated once with Bailian's image generation
  at build/prep time, in a consistent Memphis style, and bundled into the app.
  No image generation happens at runtime.

## Open Decisions (deferred to implementation plan)

- Exact frontend framework (React / Vue / vanilla) — does not affect this design.
- Final CosyVoice English voice id (chosen from the available voices during build).
- Final mascot name and look.

Resolved during planning: ASR/LLM/TTS endpoints and models (Paraformer-realtime-v2
WebSocket, qwen-plus REST, cosyvoice-v2 WebSocket); key obfuscation technique
(compile-time XOR via `build.rs`, key supplied through the `BAILIAN_API_KEY`
environment variable so it is never in source or the JS bundle).

## Success Criteria

- A child can complete the full loop (pick → describe → hear 1-2 wrong guesses →
  "Try guessing again" → correct guess → "Yes, it is!" → celebration) hands-free.
- The AI always gives at least one wrong guess before the correct one.
- Inference resolves to the correct animal for reasonable child descriptions of
  all 9 animals.
- The app builds to `.dmg`, `.exe`, and `.apk` from one codebase.
- The shipped JavaScript bundle contains no API key.
