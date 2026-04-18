use axum::{
    extract::State,
    http::{header, Method, StatusCode, Uri},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use rust_embed::RustEmbed;
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, OpenOptions},
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    sync::Arc,
};
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};
use socket2::{Socket, Domain, Type, Protocol};
use std::net::SocketAddr;

#[derive(RustEmbed)]
#[folder = "../prometheus-admin-ui/dist/"]
struct Assets;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Config {
    blocked_domains: Vec<String>,
    blocked_apps: Vec<String>,
}

#[derive(Debug, Serialize)]
struct ConfigResponse {
    blocked_domains: Vec<String>,
    blocked_apps: Vec<String>,
    security_logs: serde_json::Value,
}

struct AppState {
    config: Mutex<Config>,
    config_path: PathBuf,
    logs_path: PathBuf,
}

const START_MARKER: &str = "# --- PROMETHEUS START ---";
const END_MARKER: &str = "# --- PROMETHEUS END ---";

#[cfg(target_os = "windows")]
const HOSTS_FILE: &str = r"C:\Windows\System32\drivers\etc\hosts";
#[cfg(not(target_os = "windows"))]
const HOSTS_FILE: &str = "/etc/hosts";

fn get_config_path() -> PathBuf {
    #[cfg(target_os = "macos")]
    { PathBuf::from("/Users/Shared/prometheus-admin.json") }
    #[cfg(target_os = "linux")]
    { PathBuf::from("/tmp/prometheus-admin.json") }
    #[cfg(target_os = "windows")]
    { PathBuf::from(r"C:\ProgramData\Prometheus\admin.json") }
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    { PathBuf::from("admin.json") }
}

fn get_logs_path() -> PathBuf {
    #[cfg(target_os = "macos")]
    { PathBuf::from("/Users/Shared/security-logs.json") }
    #[cfg(target_os = "linux")]
    { PathBuf::from("/tmp/security-logs.json") }
    #[cfg(target_os = "windows")]
    { PathBuf::from(r"C:\ProgramData\Prometheus\security-logs.json") }
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    { PathBuf::from("security-logs.json") }
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

    lines.push(String::new());
    lines.push(START_MARKER.to_string());
    for domain in blocked_domains {
        let mut clean = domain.trim().to_lowercase();
        // Strip www. prefix if it exists to normalize
        if clean.starts_with("www.") {
            clean = clean.strip_prefix("www.").unwrap_or(&clean).to_string();
        }
        
        if !clean.is_empty() {
            // Using 127.0.0.1 for maximum cross-browser compatibility
            lines.push(format!("127.0.0.1 {}", clean));
            lines.push(format!("127.0.0.1 www.{}", clean));
        }
    }
    lines.push(END_MARKER.to_string());

    let mut file = OpenOptions::new()
        .write(true)
        .truncate(true)
        .create(true)
        .open(hosts_path)
        .map_err(|e| format!("Permission Denied: Run as Root/Admin (Error: {})", e))?;

    for line in lines {
        if !line.is_empty() {
            writeln!(file, "{}", line).map_err(|e| format!("Write failed: {}", e))?;
        }
    }

    // Flush DNS Cache to ensure immediate effect
    flush_dns_cache();

    Ok(())
}

fn flush_dns_cache() {
    use std::process::Command;
    
    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("dscacheutil").arg("-flushcache").status();
        let _ = Command::new("killall").args(["-HUP", "mDNSResponder"]).status();
    }
    
    #[cfg(target_os = "linux")]
    {
        // Try various common Linux DNS flush commands
        let _ = Command::new("resolvectl").arg("flush-caches").status();
        let _ = Command::new("systemd-resolve").arg("--flush-caches").status();
    }
}

async fn get_config(State(state): State<Arc<AppState>>) -> Json<ConfigResponse> {
    let config = state.config.lock().await;
    let security_logs = if state.logs_path.exists() {
        fs::read_to_string(&state.logs_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(serde_json::json!([]))
    } else {
        serde_json::json!([])
    };

    Json(ConfigResponse {
        blocked_domains: config.blocked_domains.clone(),
        blocked_apps: config.blocked_apps.clone(),
        security_logs,
    })
}

async fn update_config(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Config>,
) -> (StatusCode, String) {
    let mut config = state.config.lock().await;
    config.blocked_domains = payload.blocked_domains;
    config.blocked_apps = payload.blocked_apps;

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

    if let Err(e) = sync_hosts_file(&config.blocked_domains).await {
        return (StatusCode::FORBIDDEN, e);
    }

    (StatusCode::OK, "Config updated and synced".to_string())
}

async fn static_handler(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };

    match Assets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            ([(header::CONTENT_TYPE, mime.as_ref())], content.data).into_response()
        }
        None => {
            // React SPA Fallback: If a file isn't found, serve index.html
            if let Some(index) = Assets::get("index.html") {
                Html(index.data).into_response()
            } else {
                (StatusCode::NOT_FOUND, "404 Not Found").into_response()
            }
        }
    }
}

async fn start_app_killer(state: Arc<AppState>) {
    use sysinfo::{System, ProcessesToUpdate};
    let mut sys = System::new_all();
    
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        sys.refresh_processes(ProcessesToUpdate::All, true);
        
        let blocked_apps = {
            let config = state.config.lock().await;
            config.blocked_apps.clone()
        };
        
        if blocked_apps.is_empty() {
            continue;
        }

        for (_pid, process) in sys.processes() {
            let proc_name = process.name().to_string_lossy().to_lowercase();
            // Normalize name (remove .exe or .app)
            let clean_name = proc_name.trim_end_matches(".exe")
                                     .trim_end_matches(".app")
                                     .to_string();
            
            for app in &blocked_apps {
                let target = app.to_lowercase();
                if clean_name == target || clean_name.contains(&target) {
                    println!("[ENFORCER] TERMINATING BLOCKED APPLICATION: {}", clean_name);
                    process.kill();
                }
            }
        }
    }
}

fn fix_file_permissions(path: &Path) {
    if !path.exists() { return; }
    
    #[cfg(not(target_os = "windows"))]
    {
        use std::os::unix::fs::PermissionsExt;
        // Grant 666 (Read/Write for everyone) to the shared config/log
        let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o666));
    }
}

#[tokio::main]
async fn main() {
    let config_path = get_config_path();
    let logs_path = get_logs_path();
    
    let initial_config = if config_path.exists() {
        fs::read_to_string(&config_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(Config { blocked_domains: vec![], blocked_apps: vec![] })
    } else {
        Config { blocked_domains: vec![], blocked_apps: vec![] }
    };

    let state = Arc::new(AppState {
        config: Mutex::new(initial_config),
        config_path: config_path.clone(),
        logs_path: logs_path.clone(),
    });

    // SELF-HEALING: Fix permissions on start to prevent lockout
    fix_file_permissions(&config_path);
    fix_file_permissions(&logs_path);

    // Spawn the Application Execution Blocker
    tokio::spawn(start_app_killer(state.clone()));

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(vec![Method::GET, Method::POST])
        .allow_headers(vec![header::CONTENT_TYPE]);

    let app = Router::new()
        .route("/api/config", get(get_config).post(update_config))
        .fallback(get(static_handler))
        .layer(cors)
        .with_state(state);

    let addr: SocketAddr = "0.0.0.0:4444".parse().unwrap();
    
    // SELF-HEALING: Configure socket with REUSEADDR and REUSEPORT
    let socket = Socket::new(Domain::IPV4, Type::STREAM, Some(Protocol::TCP)).unwrap();
    
    #[cfg(not(target_os = "windows"))]
    {
        let _ = socket.set_reuse_address(true);
        let _ = socket.set_reuse_port(true);
    }
    #[cfg(target_os = "windows")]
    {
        let _ = socket.set_reuse_address(true);
    }

    socket.bind(&addr.into()).expect("Failed to bind to port 4444");
    socket.listen(128).expect("Failed to listen on port 4444");
    
    let listener: std::net::TcpListener = socket.into();
    let tokio_listener = tokio::net::TcpListener::from_std(listener).unwrap();

    println!("PROMETHEUS ENFORCER ACTIVE: http://{}", addr);
    if let Err(e) = axum::serve(tokio_listener, app).await {
        eprintln!("SERVER ERROR: {}", e);
    }
}
