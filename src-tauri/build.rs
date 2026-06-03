use std::env;
use std::fs;
use std::path::Path;

// Fixed obfuscation pad. Not a secret by itself -- it only makes the key
// non-plaintext in the binary. Real protection is "key never in source/JS".
const PAD: &[u8] = b"bibo-guess-the-animal-pad-v1-do-not-rely-on-secrecy";

fn main() {
    tauri_build::build();

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
    // Emit the SAME `PAD` used for encoding (single source of truth) as a byte array,
    // so the decoder can never drift from the encoder.
    let pad_literal = format!("{:?}", PAD); // e.g. "[98, 105, 98, ...]"
    fs::write(
        &dest,
        format!(
            "pub const OBFUSCATED_KEY_B64: &str = \"{b64}\";\npub const PAD: &[u8] = &{pad_literal};\n"
        ),
    )
    .unwrap();
}

fn base64_encode(bytes: &[u8]) -> String {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    STANDARD.encode(bytes)
}
