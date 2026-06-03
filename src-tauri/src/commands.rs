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
