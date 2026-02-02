//! ═══════════════════════════════════════════════════════════════════════════
//!                    L I C E N S E   V E R I F I C A T I O N
//! ═══════════════════════════════════════════════════════════════════════════

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Gumroad API response structure
#[derive(Debug, Deserialize)]
pub struct GumroadResponse {
    pub success: bool,
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

/// Stored license data
#[derive(Debug, Serialize, Deserialize)]
pub struct StoredLicense {
    pub license_key: String,
    pub email: Option<String>,
    pub verified_at: u64,
}

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

/// Check if a valid license exists
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
pub fn save_license(license_key: &str, email: Option<String>) -> Result<(), String> {
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
    };
    
    let json = serde_json::to_string_pretty(&license)
        .map_err(|e| format!("Failed to serialize license: {}", e))?;
    
    fs::write(&license_path, json).map_err(|e| format!("Failed to save license: {}", e))?;
    
    Ok(())
}

/// Verify a license key with Gumroad API
pub fn verify_license(license_key: &str) -> Result<(bool, Option<String>), String> {
    // Product ID - can be set via env var or hardcoded
    let product_id = std::env::var("PROMETHEUS_PRODUCT_ID")
        .unwrap_or_else(|_| "PLACEHOLDER_PRODUCT_ID".to_string());
    
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let params = [
        ("product_id", product_id.as_str()),
        ("license_key", license_key),
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
        if let Some(purchase) = &gumroad_response.purchase {
            // Check if refunded or chargebacked
            if purchase.refunded || purchase.chargebacked {
                return Ok((false, Some("License has been refunded or chargebacked".to_string())));
            }
            return Ok((true, purchase.email.clone()));
        }
        Ok((true, None))
    } else {
        let msg = gumroad_response.message.unwrap_or_else(|| "Invalid license key".to_string());
        Ok((false, Some(msg)))
    }
}

/// For development/source builds - bypass check
pub fn is_dev_bypass() -> bool {
    std::env::var("PROMETHEUS_DEV").is_ok()
}
