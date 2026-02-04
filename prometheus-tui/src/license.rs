//! ═══════════════════════════════════════════════════════════════════════════
//!                    L I C E N S E   V E R I F I C A T I O N
//!                    (Dual-Source: Website + Gumroad)
//! ═══════════════════════════════════════════════════════════════════════════

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// ═══════════════════════════════════════════════════════════════════════════
//                         R E S P O N S E   S T R U C T S
// ═══════════════════════════════════════════════════════════════════════════

/// Gumroad API response structure
#[derive(Debug, Deserialize)]
pub struct GumroadResponse {
    pub success: bool,
    #[serde(default)]
    pub uses: u32,  // Track usage count for single-use enforcement
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub purchase: Option<GumroadPurchase>,
}

#[derive(Debug, Deserialize)]
pub struct GumroadPurchase {
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub license_key: Option<String>,
    #[serde(default)]
    pub refunded: bool,
    #[serde(default)]
    pub chargebacked: bool,
}

/// Website API response structure
#[derive(Debug, Deserialize)]
pub struct WebsiteResponse {
    pub valid: bool,
    #[serde(default)]
    pub uses: u32,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
}

/// Stored license data
#[derive(Debug, Serialize, Deserialize)]
pub struct StoredLicense {
    pub license_key: String,
    pub email: Option<String>,
    pub verified_at: u64,
    #[serde(default)]
    pub source: String,  // "gumroad" or "website"
}

// ═══════════════════════════════════════════════════════════════════════════
//                         C O N F I G U R A T I O N
// ═══════════════════════════════════════════════════════════════════════════

/// Website API endpoint for license verification
const WEBSITE_API_URL: &str = "https://prometheus-cleaner.vercel.app/api/verify-license";

/// Gumroad product ID (set via env var or use placeholder)
fn get_gumroad_product_id() -> String {
    std::env::var("PROMETHEUS_PRODUCT_ID")
        .unwrap_or_else(|_| "PLACEHOLDER_PRODUCT_ID".to_string())
}

/// Key prefix for website-generated licenses
const WEBSITE_KEY_PREFIX: &str = "PROM-";

// ═══════════════════════════════════════════════════════════════════════════
//                         L I C E N S E   S T O R A G E
// ═══════════════════════════════════════════════════════════════════════════

/// Get the license file path
pub fn get_license_path() -> PathBuf {
    if let Some(config_dir) = directories::ProjectDirs::from("dev", "prometheus", "prometheus") {
        let config_path = config_dir.config_dir().to_path_buf();
        config_path.join("license")
    } else {
        // Fallback to home directory
        dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("/"))
            .join(".config")
            .join("prometheus")
            .join("license")
    }
}

/// Check if a valid license exists locally
pub fn check_stored_license() -> Option<StoredLicense> {
    let license_path = get_license_path();
    
    if license_path.exists() {
        if let Ok(content) = fs::read_to_string(&license_path) {
            if let Ok(license) = serde_json::from_str::<StoredLicense>(&content) {
                return Some(license);
            }
        }
    }
    
    None
}

/// Save a validated license
pub fn save_license(license_key: &str, email: Option<String>, source: &str) -> Result<(), String> {
    let license_path = get_license_path();
    
    // Create parent directories
    if let Some(parent) = license_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {}", e))?;
    }
    
    let license = StoredLicense {
        license_key: license_key.to_string(),
        email,
        verified_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        source: source.to_string(),
    };
    
    let json = serde_json::to_string_pretty(&license)
        .map_err(|e| format!("Failed to serialize license: {}", e))?;
    
    fs::write(&license_path, json).map_err(|e| format!("Failed to save license: {}", e))?;
    
    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
//                    M A I N   V E R I F I C A T I O N   L O G I C
// ═══════════════════════════════════════════════════════════════════════════

/// Verify a license key (routes to appropriate source)
/// Returns: (is_valid, email_or_error_message, source)
pub fn verify_license(license_key: &str) -> Result<(bool, Option<String>), String> {
    // 1. Demo Key (Always allowed)
    if license_key == "PROMETHEUS-DEMO-KEY" {
        return Ok((true, Some("demo@prometheus.local".to_string())));
    }

    // 2. Route based on key prefix
    if license_key.starts_with(WEBSITE_KEY_PREFIX) {
        verify_website_key(license_key)
    } else {
        verify_gumroad_key(license_key)
    }
}

/// Verify a Gumroad license key
fn verify_gumroad_key(license_key: &str) -> Result<(bool, Option<String>), String> {
    let product_id = get_gumroad_product_id();
    
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let params = [
        ("product_id", product_id.as_str()),
        ("license_key", license_key),
        ("increment_uses_count", "true"),  // Important: Increment on verify
    ];
    
    let response = client
        .post("https://api.gumroad.com/v2/licenses/verify")
        .form(&params)
        .send()
        .map_err(|e| format!("Network error: {}", e))?;
    
    let gumroad_response: GumroadResponse = response
        .json()
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    if gumroad_response.success {
        // SINGLE-USE CHECK: Reject if already used
        if gumroad_response.uses > 1 {
            return Ok((false, Some("License key already activated on another device.".to_string())));
        }
        
        if let Some(purchase) = &gumroad_response.purchase {
            // Check if refunded or chargebacked
            if purchase.refunded || purchase.chargebacked {
                return Ok((false, Some("License has been refunded or chargebacked.".to_string())));
            }
            return Ok((true, purchase.email.clone()));
        }
        Ok((true, None))
    } else {
        let msg = gumroad_response.message.unwrap_or_else(|| "Invalid license key.".to_string());
        Ok((false, Some(msg)))
    }
}

/// Verify a Website-generated license key
fn verify_website_key(license_key: &str) -> Result<(bool, Option<String>), String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    // Call website API
    let url = format!("{}?key={}", WEBSITE_API_URL, license_key);
    
    let response = client
        .get(&url)
        .send()
        .map_err(|e| format!("Network error: {}", e))?;
    
    // Handle non-200 responses
    if !response.status().is_success() {
        return Ok((false, Some("License server unavailable.".to_string())));
    }
    
    let website_response: WebsiteResponse = response
        .json()
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    if website_response.valid {
        // SINGLE-USE CHECK: Reject if already used
        if website_response.uses > 1 {
            return Ok((false, Some("License key already activated on another device.".to_string())));
        }
        
        Ok((true, website_response.email))
    } else {
        let msg = website_response.message.unwrap_or_else(|| "Invalid license key.".to_string());
        Ok((false, Some(msg)))
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//                         D E V   U T I L I T I E S
// ═══════════════════════════════════════════════════════════════════════════

/// For development/source builds - bypass check
pub fn is_dev_bypass() -> bool {
    std::env::var("PROMETHEUS_DEV").is_ok()
}
