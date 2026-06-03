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
        // build.rs in test sets BAILIAN_API_KEY=roundtrip-key-xyz
        assert_eq!(api_key(), "roundtrip-key-xyz");
    }
}
