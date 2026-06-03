use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::tungstenite::Message;
use super::ws;

/// Streams a 16k mono WAV clip to DashScope real-time ASR and returns the transcript.
pub async fn transcribe(api_key: &str, wav_bytes: &[u8]) -> Result<String, String> {
    let mut socket = ws::connect(api_key, false).await?;
    let task_id = ws::new_task_id();

    let run = serde_json::json!({
        "header": { "action": "run-task", "task_id": task_id, "streaming": "duplex" },
        "payload": {
            "task_group": "audio", "task": "asr", "function": "recognition",
            "model": "paraformer-realtime-v2",
            "parameters": { "format": "wav", "sample_rate": 16000 },
            "input": {}
        }
    });
    socket.send(Message::Text(run.to_string())).await.map_err(|e| format!("asr run-task: {e}"))?;
    ws::wait_for_event(&mut socket, "task-started").await?;

    // Stream the clip as binary frames (~3.2KB).
    for chunk in wav_bytes.chunks(3200) {
        socket.send(Message::Binary(chunk.to_vec())).await.map_err(|e| format!("asr audio: {e}"))?;
    }

    let finish = serde_json::json!({
        "header": { "action": "finish-task", "task_id": task_id, "streaming": "duplex" },
        "payload": { "input": {} }
    });
    socket.send(Message::Text(finish.to_string())).await.map_err(|e| format!("asr finish: {e}"))?;

    let mut transcript = String::new();
    while let Some(msg) = socket.next().await {
        let msg = msg.map_err(|e| format!("asr recv: {e}"))?;
        if let Message::Text(t) = msg {
            let v: serde_json::Value = serde_json::from_str(&t).map_err(|e| e.to_string())?;
            match v["header"]["event"].as_str() {
                Some("result-generated") => {
                    let s = &v["payload"]["output"]["sentence"];
                    if s["sentence_end"].as_bool() == Some(true) {
                        if let Some(text) = s["text"].as_str() {
                            if !transcript.is_empty() { transcript.push(' '); }
                            transcript.push_str(text);
                        }
                    }
                }
                Some("task-finished") => break,
                Some("task-failed") => {
                    return Err(format!("asr task-failed: {}", v["header"]["error_message"]));
                }
                _ => {}
            }
        }
    }
    Ok(transcript.trim().to_string())
}
