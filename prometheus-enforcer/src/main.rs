use axum::{
    extract::State,
    http::{Method, StatusCode},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, OpenOptions},
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    sync::Arc,
};
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Config {
    blocked_domains: Vec<String>,
}

struct AppState {
    config: Mutex<Config>,
    config_path: PathBuf,
}

const START_MARKER: &str = "# --- PROMETHEUS START ---";
const END_MARKER: &str = "# --- PROMETHEUS END ---";

#[cfg(target_os = "windows")]
const HOSTS_FILE: &str = r"C:\Windows\System32\drivers\etc\hosts";
#[cfg(not(target_os = "windows"))]
const HOSTS_FILE: &str = "/etc/hosts";

fn get_config_path() -> PathBuf {
    if let Some(home) = dirs::home_dir() {
        home.join(".config").join("prometheus").join("admin.json")
    } else {
        PathBuf::from("admin.json")
    }
}

async fn sync_hosts_file(blocked_domains: &[String]) -> Result<(), String> {
    let hosts_path = Path::new(HOSTS_FILE);
    let mut lines = Vec::new();

    if hosts_path.exists() {
        let file = fs::File::open(hosts_path).map_err(|e| format!("Failed to open hosts: {}", e))?;
        let reader = BufReader::new(file);
        let mut in_prometheus_block = false;

        for line in reader.lines() {
            if let Ok(l) = line {
                if l.trim() == START_MARKER {
                    in_prometheus_block = true;
                    continue;
                }
                if l.trim() == END_MARKER {
                    in_prometheus_block = false;
                    continue;
                }
                if !in_prometheus_block {
                    lines.push(l);
                }
            }
        }
    }

    // Append the new block
    lines.push(String::new());
    lines.push(START_MARKER.to_string());
    for domain in blocked_domains {
        let clean = domain.trim().to_lowercase();
        if !clean.is_empty() {
            lines.push(format!("0.0.0.0 {}", clean));
            lines.push(format!("0.0.0.0 www.{}", clean));
        }
    }
    lines.push(END_MARKER.to_string());

    // Write back
    let mut file = OpenOptions::new()
        .write(true)
        .truncate(true)
        .create(true)
        .open(hosts_path)
        .map_err(|e| format!("Permission Denied: Run as Root/Admin (Error: {})", e))?;

    for line in lines {
        writeln!(file, "{}", line).map_err(|e| format!("Write failed: {}", e))?;
    }

    println!("SUCCESS: Hosts file synced with {} domains.", blocked_domains.len());
    Ok(())
}

async fn get_config(State(state): State<Arc<AppState>>) -> Json<Config> {
    let config = state.config.lock().await;
    Json(config.clone())
}

async fn update_config(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Config>,
) -> (StatusCode, String) {
    let mut config = state.config.lock().await;
    config.blocked_domains = payload.blocked_domains;

    // Save to file
    if let Some(parent) = state.config_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    match serde_json::to_string_pretty(&*config) {
        Ok(json) => {
            if let Err(e) = fs::write(&state.config_path, json) {
                return (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to save config: {}", e));
            }
        }
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Serialization error: {}", e)),
    }

    // Sync hosts
    if let Err(e) = sync_hosts_file(&config.blocked_domains).await {
        return (StatusCode::FORBIDDEN, e);
    }

    (StatusCode::OK, "Config updated and synced".to_string())
}

#[tokio::main]
async fn main() {
    let config_path = get_config_path();
    
    // Load existing config
    let initial_config = if config_path.exists() {
        fs::read_to_string(&config_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(Config { blocked_domains: vec![] })
    } else {
        Config { blocked_domains: vec![] }
    };

    let state = Arc::new(AppState {
        config: Mutex::new(initial_config),
        config_path,
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(vec![Method::GET, Method::POST])
        .allow_headers(vec![axum::http::header::CONTENT_TYPE]);

    let app = Router::new()
        .route("/api/config", get(get_config).post(update_config))
        .layer(cors)
        .with_state(state);

    let addr = "0.0.0.0:4444";
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("PROMETHEUS ENFORCER ACTIVE: Listening on http://{}", addr);

    axum::serve(listener, app).await.unwrap();
}
