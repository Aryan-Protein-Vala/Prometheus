use axum::{
    extract::{State, Request},
    http::{StatusCode, header, Method},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::{
    fs::{self, OpenOptions},
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    sync::Arc,
    time::{Duration, SystemTime},
};
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AdminConfig {
    pub master_password_hash: String,
    pub blocked_domains: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct UpdateConfigRequest {
    pub blocked_domains: Vec<String>,
}

#[derive(Debug, Serialize)]
struct ConfigResponse {
    pub blocked_domains: Vec<String>,
    pub security_logs: serde_json::Value,
}

#[derive(Clone)]
struct AppState {
    config_path: PathBuf,
    logs_path: PathBuf,
}

// OS specific paths
#[cfg(target_os = "windows")]
const HOSTS_FILE: &str = r"C:\Windows\System32\drivers\etc\hosts";
#[cfg(not(target_os = "windows"))]
const HOSTS_FILE: &str = "/etc/hosts";

fn get_config_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        PathBuf::from(r"C:\ProgramData\Prometheus\admin-config.json")
    }
    #[cfg(not(target_os = "windows"))]
    {
        if let Some(home) = dirs::home_dir() {
            home.join(".config").join("prometheus").join("admin-config.json")
        } else {
            PathBuf::from("/etc/prometheus/admin-config.json")
        }
    }
}

fn get_logs_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        PathBuf::from(r"C:\ProgramData\Prometheus\security-logs.json")
    }
    #[cfg(not(target_os = "windows"))]
    {
        if let Some(home) = dirs::home_dir() {
            home.join(".config").join("prometheus").join("security-logs.json")
        } else {
            PathBuf::from("/etc/prometheus/security-logs.json")
        }
    }
}

fn read_config(path: &Path) -> Result<AdminConfig, String> {
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

fn write_config(path: &Path, config: &AdminConfig) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

/// Securely modifies the hosts file to route blocked domains to 0.0.0.0
fn sync_hosts_file(blocked_domains: &[String]) -> Result<(), String> {
    let hosts_path = Path::new(HOSTS_FILE);
    let mut current_lines = Vec::new();

    if hosts_path.exists() {
        let file = fs::File::open(hosts_path).map_err(|e| format!("Failed to open hosts: {}", e))?;
        let reader = BufReader::new(file);
        for line in reader.lines() {
            if let Ok(l) = line {
                current_lines.push(l);
            }
        }
    }

    // Filter out previous prometheus blocks
    let mut new_lines: Vec<String> = current_lines
        .into_iter()
        .filter(|line| !line.ends_with("# PROMETHEUS_BLOCK"))
        .collect();

    // Ensure there is a trailing newline if it's not empty
    if let Some(last) = new_lines.last() {
        if !last.trim().is_empty() {
            new_lines.push(String::new());
        }
    }

    // Append new blocks
    for domain in blocked_domains {
        let domain_trim = domain.trim();
        if !domain_trim.is_empty() {
            new_lines.push(format!("0.0.0.0 {} # PROMETHEUS_BLOCK", domain_trim));
            new_lines.push(format!("0.0.0.0 www.{} # PROMETHEUS_BLOCK", domain_trim));
        }
    }

    // Write back securely
    // In production, this requires the service to be running as root/SYSTEM
    let mut file = OpenOptions::new()
        .write(true)
        .truncate(true)
        .create(true)
        .open(hosts_path)
        .map_err(|e| format!("Failed to write hosts (requires elevated permissions): {}", e))?;

    for line in new_lines {
        writeln!(file, "{}", line).map_err(|e| format!("Write error: {}", e))?;
    }

    Ok(())
}

async fn background_sync_loop(config_path: PathBuf) {
    let mut last_modified = SystemTime::UNIX_EPOCH;
    
    loop {
        if let Ok(metadata) = fs::metadata(&config_path) {
            if let Ok(modified) = metadata.modified() {
                if modified > last_modified {
                    if let Ok(config) = read_config(&config_path) {
                        let _ = sync_hosts_file(&config.blocked_domains);
                        last_modified = modified;
                    }
                }
            }
        }
        tokio::time::sleep(Duration::from_secs(5)).await;
    }
}

// --- API Auth Middleware ---
async fn require_auth(
    State(state): State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    if req.method() == Method::OPTIONS {
        return Ok(next.run(req).await); // let CORS handle options
    }

    let auth_header = req.headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let password = if let Some(header_value) = auth_header {
        if let Some(stripped) = header_value.strip_prefix("Bearer ") {
            stripped
        } else {
            return Err(StatusCode::UNAUTHORIZED);
        }
    } else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    // Hash the incoming password
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let incoming_hash = hex::encode(hasher.finalize());

    // Read config to get correct hash
    let config = read_config(&state.config_path).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    if incoming_hash == config.master_password_hash {
        Ok(next.run(req).await)
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}

// --- API Routes ---
async fn get_config(State(state): State<Arc<AppState>>) -> Result<Json<ConfigResponse>, StatusCode> {
    let config = read_config(&state.config_path).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Attempt to read security logs from TUI
    let security_logs = if state.logs_path.exists() {
        let data = fs::read_to_string(&state.logs_path).unwrap_or_default();
        serde_json::from_str(&data).unwrap_or(serde_json::json!([]))
    } else {
        serde_json::json!([])
    };

    Ok(Json(ConfigResponse {
        blocked_domains: config.blocked_domains,
        security_logs,
    }))
}

async fn update_config(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<UpdateConfigRequest>,
) -> Result<StatusCode, StatusCode> {
    let mut config = read_config(&state.config_path).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    config.blocked_domains = payload.blocked_domains.clone();
    
    write_config(&state.config_path, &config).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Immediately trigger sync
    if sync_hosts_file(&config.blocked_domains).is_err() {
        // We log error but return success since config saved
        // In reality, we might want to return an error status here.
        eprintln!("Failed to sync hosts file. Elevated permissions missing?");
    }

    Ok(StatusCode::OK)
}

#[tokio::main]
async fn main() {
    let config_path = get_config_path();
    let logs_path = get_logs_path();

    // Ensure default config exists
    if !config_path.exists() {
        if let Some(parent) = config_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        // Default password "admin" hash for fresh installs (should be set by install script)
        let mut hasher = Sha256::new();
        hasher.update(b"admin");
        let default_config = AdminConfig {
            master_password_hash: hex::encode(hasher.finalize()),
            blocked_domains: vec![],
        };
        let _ = write_config(&config_path, &default_config);
    }

    let state = Arc::new(AppState {
        config_path: config_path.clone(),
        logs_path,
    });

    // Spawn high-performance sync loop
    let sync_path = config_path.clone();
    tokio::spawn(async move {
        background_sync_loop(sync_path).await;
    });

    let cors = CorsLayer::new()
        .allow_origin(Any) // For simplicity, restricting to localhost in production is better
        .allow_methods(vec![Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(vec![header::AUTHORIZATION, header::CONTENT_TYPE]);

    let api_routes = Router::new()
        .route("/config", get(get_config).post(update_config))
        .route_layer(middleware::from_fn_with_state(state.clone(), require_auth));

    let app = Router::new()
        .nest("/api", api_routes)
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:4444").await.unwrap();
    println!("Prometheus-Enforcer running on http://127.0.0.1:4444");
    
    axum::serve(listener, app).await.unwrap();
}
