use futures_util::StreamExt;
use tokio::net::TcpStream;
use tokio_tungstenite::{
    connect_async, MaybeTlsStream, WebSocketStream,
    tungstenite::client::IntoClientRequest,
    tungstenite::http::HeaderValue,
    tungstenite::Message,
};

pub const WS_URL: &str = "wss://dashscope.aliyuncs.com/api-ws/v1/inference";
pub type Ws = WebSocketStream<MaybeTlsStream<TcpStream>>;

/// Open an authenticated DashScope inference WebSocket.
/// `data_inspection` adds the header required by TTS.
pub async fn connect(api_key: &str, data_inspection: bool) -> Result<Ws, String> {
    let mut req = WS_URL.into_client_request().map_err(|e| format!("ws req: {e}"))?;
    let headers = req.headers_mut();
    headers.insert(
        "Authorization",
        HeaderValue::from_str(&format!("bearer {api_key}")).map_err(|e| e.to_string())?,
    );
    if data_inspection {
        headers.insert("X-DashScope-DataInspection", HeaderValue::from_static("enable"));
    }
    let (ws, _resp) = connect_async(req).await.map_err(|e| format!("ws connect: {e}"))?;
    Ok(ws)
}

pub fn new_task_id() -> String {
    uuid::Uuid::new_v4().simple().to_string()
}

/// Reads text frames until the named event arrives. Errors on task-failed or early close.
pub async fn wait_for_event(socket: &mut Ws, event: &str) -> Result<(), String> {
    while let Some(msg) = socket.next().await {
        let msg = msg.map_err(|e| format!("ws recv: {e}"))?;
        if let Message::Text(t) = msg {
            let v: serde_json::Value = serde_json::from_str(&t).map_err(|e| e.to_string())?;
            match v["header"]["event"].as_str() {
                Some(e) if e == event => return Ok(()),
                Some("task-failed") => {
                    return Err(format!("task-failed: {}", v["header"]["error_message"]));
                }
                _ => {}
            }
        }
    }
    Err(format!("ws closed before {event}"))
}
