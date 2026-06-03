# Guess the Animal 🐘

A hands-free voice play station for a kindergarten English exhibition. A child
describes one of 9 animals; an AI mascot ("Bibo") infers the answer, deliberately
guesses wrong 1–2 times to train listening, then lands the correct answer when the
child says "Try guessing again." and confirms "Yes, it is!".

Built with **Tauri v2** (one codebase → `.dmg` / `.exe` / `.apk`), a Vite + React +
TypeScript frontend, and a Rust core that holds the obfuscated Bailian API key and
talks to Alibaba Cloud Bailian (DashScope) for speech recognition, inference, and
speech synthesis.

See the design spec and implementation plan in `docs/superpowers/`.

## Prerequisites

- **Node.js** 20+ and npm
- **Rust** (stable) + Cargo
- **Tauri v2** system deps — see https://v2.tauri.app/start/prerequisites/
- For Android: Android SDK + NDK + JDK 17 (see Tauri mobile docs)

## The API key (read this)

The Bailian API key is **never** stored in source or the JS bundle. It is read from
the `BAILIAN_API_KEY` environment variable at **compile time**, XOR-obfuscated, and
baked into the Rust binary. So you must set it in the environment **when you build**:

```bash
export BAILIAN_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

This is best-effort protection: the key is not plaintext in the shipped files and is
out of the JS layer, but a determined attacker with the binary could still extract it
(acceptable for a kindergarten exhibition). **Rotate the key if a build leaks.**

## Develop

```bash
npm install
export BAILIAN_API_KEY=sk-...   # required for the voice features to work
npm run tauri dev               # opens the desktop app with hot-reload
```

Frontend-only (no native shell, no voice):

```bash
npm run dev      # http://localhost:5173
```

## Test

```bash
npm test                                   # frontend unit tests (Vitest)
npx tsc --noEmit                           # type check
BAILIAN_API_KEY=test cargo test \
  --manifest-path src-tauri/Cargo.toml     # Rust unit tests
```

## Build installers

Set `BAILIAN_API_KEY` first (see above), then:

| Target | Command | Output |
|--------|---------|--------|
| macOS `.dmg` (on a Mac) | `npm run tauri build` | `src-tauri/target/release/bundle/dmg/` |
| Windows `.exe`/`.msi` (on Windows) | `npm run tauri build` | `src-tauri/target/release/bundle/` |
| Android `.apk` | `npm run tauri android init` then `npm run tauri android build --apk` | `src-tauri/gen/android/app/build/outputs/` |

Desktop installers must be built on their own OS (a Mac for `.dmg`, Windows for `.exe`).

**Verify the key didn't leak into the web bundle** after a build:

```bash
grep -rF "$BAILIAN_API_KEY" dist/ && echo "LEAK!" || echo "no key in dist (good)"
```

## Status / remaining gates

The full app is implemented and unit-tested. These steps require your machine,
credentials, or devices and are **not yet done**:

1. **Animal images (Phase 6):** generate 9 Memphis-style scene PNGs with Bailian's
   image API (prompt template in `scripts/generate-images.md`), save to
   `assets/animals/<id>.png` and copy to `public/animals/`. Until then the UI shows
   emoji fallbacks. Filenames: `monkey, kangaroo, elephant, turtle, tiger, crab, bird, snake, spider`.
2. **Confirm DashScope ids:** verify `paraformer-realtime-v2` (ASR) and a cheerful
   **English-capable** `cosyvoice-v2` voice (the code defaults to `longxiaochun_v2` in
   `src-tauri/src/bailian/tts.rs`) in your Bailian console.
3. **Live run-through:** `BAILIAN_API_KEY=sk-... npm run tauri dev`, then walk the loop
   (start → pick Elephant → "It's big, it has a long nose" → hear a wrong guess →
   "try guessing again" → "Elephant" → "yes it is" → confetti).
4. **Android mic permission:** after `tauri android init`, add to the generated
   `AndroidManifest.xml`:
   `<uses-permission android:name="android.permission.RECORD_AUDIO" />` and
   `<uses-permission android:name="android.permission.INTERNET" />`.
5. **Package** for each target and smoke-test on a clean machine / tablet.
