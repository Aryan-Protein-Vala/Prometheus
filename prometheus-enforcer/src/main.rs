use axum::{
    extract::{State},
    http::{StatusCode, Uri, header, HeaderMap},
    response::{Html, IntoResponse, Response},
    routing::get,
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
use socket2::{Socket, Domain, Type, Protocol};
use std::net::SocketAddr;

#[derive(RustEmbed)]
#[folder = "../prometheus-admin-ui/dist/"]
struct Assets;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Config {
    blocked_domains: Vec<String>,
    blocked_apps: Vec<String>,
    master_password: Option<String>,
    license_key: Option<String>,
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
    license_path: PathBuf,
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
    { PathBuf::from("/etc/prometheus/admin-config.json") }
    #[cfg(target_os = "windows")]
    { PathBuf::from(r"C:\ProgramData\Prometheus\admin.json") }
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    { PathBuf::from("admin.json") }
}

fn get_logs_path() -> PathBuf {
    #[cfg(target_os = "macos")]
    { PathBuf::from("/Users/Shared/security-logs.json") }
    #[cfg(target_os = "linux")]
    { PathBuf::from("/etc/prometheus/security-logs.json") }
    #[cfg(target_os = "windows")]
    { PathBuf::from(r"C:\ProgramData\Prometheus\security-logs.json") }
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    { PathBuf::from("security-logs.json") }
}

fn get_license_path() -> PathBuf {
    #[cfg(target_os = "macos")]
    { PathBuf::from("/Users/Shared/prometheus.license") }
    #[cfg(target_os = "linux")]
    { PathBuf::from("/etc/prometheus/prometheus.license") }
    #[cfg(target_os = "windows")]
    { PathBuf::from(r"C:\ProgramData\Prometheus\prometheus.license") }
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    { PathBuf::from("prometheus.license") }
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
    
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("ipconfig").arg("/flushdns").status();
    }
    
    #[cfg(target_os = "linux")]
    {
        // Try various common Linux DNS flush commands
        let _ = Command::new("resolvectl").arg("flush-caches").status();
        let _ = Command::new("systemd-resolve").arg("--flush-caches").status();
        let _ = Command::new("nscd").args(["-i", "hosts"]).status();
    }
}

async fn start_fleet_sync(state: Arc<AppState>) {
    let client = reqwest::Client::new();
    let hwid = machine_uid::get().unwrap_or_else(|_| "UNKNOWN_DEVICE".to_string());
    
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        
        let license_key = {
            let config = state.config.lock().await;
            config.license_key.clone()
        };

        if let Some(key) = license_key {
            println!("[FLEET] Synchronizing with Command Center...");
            
            let res = client.post("https://prometheus-cleaner.vercel.app/api/fleet/sync")
                .json(&serde_json::json!({
                    "licenseKey": key,
                    "hwid": hwid,
                }))
                .send()
                .await;

            if let Ok(response) = res {
                if let Ok(data) = response.json::<serde_json::Value>().await {
                    if data["success"].as_bool().unwrap_or(false) {
                        let policy = &data["policy"];
                        let mut config = state.config.lock().await;
                        
                        // Update lists if changed
                        let remote_domains: Vec<String> = policy["blockedDomains"]
                            .as_array().unwrap_or(&vec![]).iter()
                            .map(|v| v.as_str().unwrap_or("").to_string()).collect();
                        
                        let remote_apps: Vec<String> = policy["blockedApps"]
                            .as_array().unwrap_or(&vec![]).iter()
                            .map(|v| v.as_str().unwrap_or("").to_string()).collect();

                        let remote_pass = policy["masterPassword"].as_str().map(|s| s.to_string());

                        if config.blocked_domains != remote_domains || config.blocked_apps != remote_apps || config.master_password != remote_pass {
                            println!("[FLEET] NEW POLICY RECEIVED: Refreshing Defense Systems.");
                            config.blocked_domains = remote_domains;
                            config.blocked_apps = remote_apps;
                            config.master_password = remote_pass;
                            
                            // Persist
                            if let Ok(json) = serde_json::to_string_pretty(&*config) {
                                let _ = fs::write(&state.config_path, json);
                            }
                            
                            // Re-sync hosts
                            let _ = sync_hosts_file(&config.blocked_domains).await;
                        }
                    }
                }
            }
        }
    }
}

async fn get_config(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>
) -> Result<Json<ConfigResponse>, StatusCode> {
    let config = state.config.lock().await;
    
    // SAFEGUARD AUTH
    let auth = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");
    
    let master_pass = config.master_password.clone().unwrap_or_default();
    let license_key = config.license_key.clone().unwrap_or_default();

    if auth != master_pass && auth != license_key && !master_pass.is_empty() {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let security_logs = if state.logs_path.exists() {
        fs::read_to_string(&state.logs_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(serde_json::json!([]))
    } else {
        serde_json::json!([])
    };

    Ok(Json(ConfigResponse {
        blocked_domains: config.blocked_domains.clone(),
        blocked_apps: config.blocked_apps.clone(),
        security_logs,
    }))
}

async fn update_config(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Config>,
) -> Result<(StatusCode, String), StatusCode> {
    let mut config = state.config.lock().await;

    // SAFEGUARD AUTH
    let auth = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");
    
    let master_pass = config.master_password.clone().unwrap_or_default();
    let license_key = config.license_key.clone().unwrap_or_default();

    if auth != master_pass && auth != license_key && !master_pass.is_empty() {
        return Err(StatusCode::UNAUTHORIZED);
    }

    config.blocked_domains = payload.blocked_domains;
    config.blocked_apps = payload.blocked_apps;

    if let Some(parent) = state.config_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    match serde_json::to_string_pretty(&*config) {
        Ok(json) => {
            if let Err(e) = fs::write(&state.config_path, json) {
                return Ok((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to save config: {}", e)));
            }
        }
        Err(e) => return Ok((StatusCode::INTERNAL_SERVER_ERROR, format!("Serialization error: {}", e))),
    }

    if let Err(e) = sync_hosts_file(&config.blocked_domains).await {
        return Ok((StatusCode::FORBIDDEN, e));
    }

    Ok((StatusCode::OK, "Config updated and synced".to_string()))
}

async fn static_handler(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };

    match Assets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            Response::builder()
                .header(header::CONTENT_TYPE, mime.as_ref())
                .header(header::CACHE_CONTROL, "no-store, must-revalidate")
                .header("X-Content-Type-Options", "nosniff")
                .body(axum::body::Body::from(content.data))
                .unwrap_or_else(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Error").into_response())
        }
        None => {
            if let Some(index) = Assets::get("index.html") {
                Response::builder()
                    .header(header::CONTENT_TYPE, "text/html")
                    .header(header::CACHE_CONTROL, "no-store, must-revalidate")
                    .body(axum::body::Body::from(index.data))
                    .unwrap_or_else(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Error").into_response())
            } else {
                (StatusCode::NOT_FOUND, "404 Not Found").into_response()
            }
        }
    }
}

async fn health_check() -> impl IntoResponse {
    (StatusCode::OK, Json(serde_json::json!({"status": "active"})))
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
    let license_path = get_license_path();
    
    let mut initial_config = if config_path.exists() {
        fs::read_to_string(&config_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(Config { 
                blocked_domains: vec![], 
                blocked_apps: vec![],
                master_password: None,
                license_key: None,
            })
    } else {
        Config { 
            blocked_domains: vec![], 
            blocked_apps: vec![],
            master_password: None,
            license_key: None,
        }
    };

    // If license key isn't in config but exists in license file, pull it in
    if initial_config.license_key.is_none() && license_path.exists() {
        if let Ok(key) = fs::read_to_string(&license_path) {
            initial_config.license_key = Some(key.trim().to_string());
        }
    }

    let state = Arc::new(AppState {
        config: Mutex::new(initial_config),
        config_path: config_path.clone(),
        logs_path: logs_path.clone(),
        license_path: license_path.clone(),
    });

    // SELF-HEALING: Fix permissions on start to prevent lockout
    fix_file_permissions(&config_path);
    fix_file_permissions(&logs_path);

    // Spawn Fleet Sync and App Killer
    tokio::spawn(start_fleet_sync(state.clone()));
    tokio::spawn(start_app_killer(state.clone()));

    let app = Router::new()
        .route("/api/health", get(health_check))
        .route("/api/config", get(get_config).post(update_config))
        .fallback(get(static_handler))
        .with_state(state);

    let addr: SocketAddr = "127.0.0.1:4444".parse().unwrap();
    
    // SELF-HEALING: Configure socket with REUSEADDR
    let socket = Socket::new(Domain::IPV4, Type::STREAM, Some(Protocol::TCP)).unwrap();
    let _ = socket.set_reuse_address(true);

    socket.bind(&addr.into()).expect("Failed to bind to port 4444");
    socket.listen(128).expect("Failed to listen on port 4444");
    
    let listener: std::net::TcpListener = socket.into();
    let tokio_listener = tokio::net::TcpListener::from_std(listener).unwrap();

    println!("PROMETHEUS ENFORCER ACTIVE: http://{}", addr);
    if let Err(e) = axum::serve(tokio_listener, app).await {
        eprintln!("SERVER ERROR: {}", e);
    }
}
