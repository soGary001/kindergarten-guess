use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::tungstenite::Message;
use super::ws;

// Cheerful, English-capable child voice (CosyVoice v2). Verified against the live API.
const VOICE: &str = "longniuniu";

/// Synthesizes English speech with the default child voice; returns concatenated MP3 bytes.
pub async fn synthesize(api_key: &str, text: &str) -> Result<Vec<u8>, String> {
    synthesize_with(api_key, text, VOICE).await
}

/// Synthesizes speech with an explicit CosyVoice v2 voice id.
pub async fn synthesize_with(api_key: &str, text: &str, voice: &str) -> Result<Vec<u8>, String> {
    let mut socket = ws::connect(api_key, true).await?;
    let task_id = ws::new_task_id();

    let run = serde_json::json!({
        "header": { "action": "run-task", "task_id": task_id, "streaming": "duplex" },
        "payload": {
            "task_group": "audio", "task": "tts", "function": "SpeechSynthesizer",
            "model": "cosyvoice-v2",
            "parameters": { "text_type": "PlainText", "voice": voice, "format": "mp3", "sample_rate": 22050 },
            "input": {}
        }
    });
    socket.send(Message::Text(run.to_string())).await.map_err(|e| format!("tts run-task: {e}"))?;
    ws::wait_for_event(&mut socket, "task-started").await?;

    let cont = serde_json::json!({
        "header": { "action": "continue-task", "task_id": task_id, "streaming": "duplex" },
        "payload": { "input": { "text": text } }
    });
    socket.send(Message::Text(cont.to_string())).await.map_err(|e| format!("tts continue: {e}"))?;

    let finish = serde_json::json!({
        "header": { "action": "finish-task", "task_id": task_id, "streaming": "duplex" },
        "payload": { "input": {} }
    });
    socket.send(Message::Text(finish.to_string())).await.map_err(|e| format!("tts finish: {e}"))?;

    let mut audio: Vec<u8> = Vec::new();
    while let Some(msg) = socket.next().await {
        match msg.map_err(|e| format!("tts recv: {e}"))? {
            Message::Binary(b) => audio.extend_from_slice(&b),
            Message::Text(t) => {
                let v: serde_json::Value = serde_json::from_str(&t).map_err(|e| e.to_string())?;
                match v["header"]["event"].as_str() {
                    Some("task-finished") => break,
                    Some("task-failed") => {
                        return Err(format!("tts task-failed: {}", v["header"]["error_message"]));
                    }
                    _ => {}
                }
            }
            _ => {}
        }
    }
    if audio.is_empty() { return Err("tts returned no audio".into()); }
    Ok(audio)
}

#[cfg(test)]
mod live_tests {
    use super::*;

    // Live probe: BAILIAN_API_KEY=sk-... cargo test --manifest-path src-tauri/Cargo.toml \
    //   --lib bailian::tts::live_tests -- --ignored --nocapture
    #[tokio::test]
    #[ignore]
    async fn probe_english_child_voices() {
        let key = std::env::var("BAILIAN_API_KEY").expect("set BAILIAN_API_KEY");
        let candidates = ["longniuniu", "longshanshan", "longhuhu", "longpaopao", "longxiaochun_v2"];
        let text = "Yes! It's an elephant! Great job!";
        for v in candidates {
            match synthesize_with(&key, text, v).await {
                Ok(bytes) => println!("VOICE {v}: OK, {} bytes mp3", bytes.len()),
                Err(e) => println!("VOICE {v}: FAILED -> {e}"),
            }
        }
    }
}
