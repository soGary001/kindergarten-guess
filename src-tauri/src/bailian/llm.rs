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
