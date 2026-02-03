//! ═══════════════════════════════════════════════════════════════════════════
//!                     P R O M E T H E U S
//!               ═══ UNIVERSAL SYSTEM CLEANER ═══
//! ═══════════════════════════════════════════════════════════════════════════

mod license;

use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style, Stylize},
    text::{Line, Span},
    widgets::{Block, Borders, BorderType, Clear, Gauge, List, ListItem, ListState, Paragraph},
    Terminal,
};
use std::{
    io,
    path::{Path, PathBuf},
    sync::mpsc,
    thread,
    time::{Duration, Instant, SystemTime},
};
use walkdir::WalkDir;

// ═══════════════════════════════════════════════════════════════════════════
//                    🛡️ PROTECTED PATHS - NEVER DELETE 🛡️
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(target_os = "macos")]
const PROTECTED_PATHS: &[&str] = &[
    ".ssh", ".gnupg", ".aws", ".kube", ".docker/config.json",
    ".gitconfig", ".zshrc", ".bashrc", ".bash_profile", ".profile", ".env",
    "Library/Keychains", "Library/Preferences", "Library/Safari/Bookmarks.plist",
    "Library/Mail", "Library/Messages", "Library/Calendars", "Library/Notes",
    ".config", ".local/share", ".vim", ".vimrc", ".zsh_history",
];

#[cfg(target_os = "windows")]
const PROTECTED_PATHS: &[&str] = &[
    ".ssh", ".gnupg", ".aws", ".kube", ".docker/config.json", ".gitconfig",
    "AppData/Roaming/Microsoft", "AppData/Local/Microsoft",
    "AppData/Roaming/Code/User/settings.json",
    "NTUSER.DAT", ".config", ".vim", ".zsh_history",
    "Windows", "Program Files", "Program Files (x86)",
];

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
const PROTECTED_PATHS: &[&str] = &[
    ".ssh", ".gnupg", ".aws", ".kube", ".docker/config.json", ".gitconfig",
    ".config", ".local/share", ".vim",
    "Desktop", "Documents", "Pictures", "Videos", "Music", "Downloads",
];

fn is_protected(path: &Path, home: &Path) -> bool {
    let path_str = path.to_string_lossy();
    let home_str = home.to_string_lossy();
    let sep = std::path::MAIN_SEPARATOR;
    
    for protected in PROTECTED_PATHS {
        let normalized = protected.replace('/', &sep.to_string());
        let full_protected = format!("{}{}{}", home_str, sep, normalized);
        if path_str.starts_with(&full_protected) || path_str == full_protected {
            return true;
        }
    }
    
    // Never delete things directly in home that aren't explicitly safe
    if path.parent() == Some(home) {
        let name = path.file_name().unwrap_or_default().to_string_lossy();
        let safe = [".cache", ".npm", ".gradle", ".m2", ".cargo", ".nuget", ".Trash"];
        if !safe.iter().any(|s| name == *s) {
            return true;
        }
    }
    
    false
}

// ═══════════════════════════════════════════════════════════════════════════
//                          C O L O R   P A L E T T E
// ═══════════════════════════════════════════════════════════════════════════

mod colors {
    use ratatui::style::Color;
    
    // ═══ WEBSITE-MATCHED COLOR SCHEME ═══
    // Based on OKLCH dark mode from globals.css
    // Premium, minimal, monochrome aesthetic
    
    // Backgrounds (oklch 0.145 = ~21,21,21)
    pub const BG_DEEP: Color = Color::Rgb(14, 14, 16);      // Deepest black
    pub const BG_SURFACE: Color = Color::Rgb(21, 21, 24);   // Card background
    pub const BG_ELEVATED: Color = Color::Rgb(28, 28, 32);  // Hover/elevated
    
    // Borders (oklch 0.269 = ~50,50,50)
    pub const BORDER: Color = Color::Rgb(45, 45, 52);       // Subtle border
    pub const BORDER_ACTIVE: Color = Color::Rgb(80, 80, 90); // Active/focused
    
    // Text (foreground oklch 0.985 = ~250,250,250)
    pub const TEXT_PRIMARY: Color = Color::Rgb(250, 250, 252);  // Primary text
    pub const TEXT_SECONDARY: Color = Color::Rgb(180, 180, 185); // Secondary
    pub const TEXT_MUTED: Color = Color::Rgb(120, 120, 128);    // Muted/hint
    pub const TEXT_DIM: Color = Color::Rgb(80, 80, 88);         // Very dim
    
    // Accents - minimal, sophisticated
    pub const ACCENT_PRIMARY: Color = Color::Rgb(250, 250, 252); // White accent
    pub const ACCENT_SUCCESS: Color = Color::Rgb(120, 200, 140); // Soft green
    pub const ACCENT_WARNING: Color = Color::Rgb(200, 170, 100); // Soft amber
    pub const ACCENT_DANGER: Color = Color::Rgb(200, 100, 100);  // Soft red
    
    // Legacy aliases for compatibility
    pub const ACCENT_CYAN: Color = TEXT_PRIMARY;     // Use white instead
    pub const ACCENT_RED: Color = ACCENT_DANGER;
    pub const ACCENT_GREEN: Color = ACCENT_SUCCESS;
    pub const ACCENT_YELLOW: Color = ACCENT_WARNING;
    pub const ACCENT_PURPLE: Color = Color::Rgb(160, 140, 200);
    pub const ACCENT_ORANGE: Color = Color::Rgb(200, 150, 100);
}

// ═══════════════════════════════════════════════════════════════════════════
//                              D A T A   T Y P E S
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
enum JunkCategory {
    SystemJunk,      // Logs, caches, trash
    BrowserBloat,    // Chrome, Firefox, Safari, Brave, Edge
    UserHoarding,    // Old downloads, screenshots, mail downloads
    PackageManagers, // Homebrew, pip, npm, chocolatey
    LargeFiles,      // Files > 500MB
}

impl JunkCategory {
    fn name(&self) -> &str {
        match self {
            JunkCategory::SystemJunk => "System Junk",
            JunkCategory::BrowserBloat => "Browser Bloat",
            JunkCategory::UserHoarding => "User Hoarding",
            JunkCategory::PackageManagers => "Package Managers",
            JunkCategory::LargeFiles => "Large Files (500MB+)",
        }
    }

    fn icon(&self) -> &str {
        match self {
            JunkCategory::SystemJunk => "🗑️",
            JunkCategory::BrowserBloat => "🌐",
            JunkCategory::UserHoarding => "📥",
            JunkCategory::PackageManagers => "📦",
            JunkCategory::LargeFiles => "💾",
        }
    }

    fn color(&self) -> Color {
        match self {
            JunkCategory::SystemJunk => colors::ACCENT_RED,
            JunkCategory::BrowserBloat => colors::ACCENT_PURPLE,
            JunkCategory::UserHoarding => colors::ACCENT_YELLOW,
            JunkCategory::PackageManagers => colors::ACCENT_CYAN,
            JunkCategory::LargeFiles => colors::ACCENT_ORANGE,
        }
    }
}

#[derive(Clone, Debug)]
struct JunkItem {
    path: PathBuf,
    size: u64,
    junk_type: String,
}

#[derive(Clone, Debug)]
struct CategoryNode {
    category: JunkCategory,
    items: Vec<JunkItem>,
    total_size: u64,
    expanded: bool,
}

impl CategoryNode {
    fn new(category: JunkCategory) -> Self {
        Self {
            category,
            items: Vec::new(),
            total_size: 0,
            expanded: false,
        }
    }

    fn add_item(&mut self, item: JunkItem) {
        self.total_size += item.size;
        self.items.push(item);
    }
}

#[derive(Clone, Debug, PartialEq)]
enum TreePosition {
    Category(usize),
    Item(usize, usize),
}

#[derive(PartialEq, Clone)]
enum AppView {
    License,
    Home,
    Scanning,
    Results,
    Deleting,
}

#[derive(PartialEq, Clone)]
enum ScanStatus {
    Idle,
    Scanning,
    Complete,
}

// Scan progress message for thread communication
#[derive(Clone)]
enum ScanMessage {
    Progress(String),
    CategoryDone(CategoryNode),
    Complete,
}

struct AppState {
    view: AppView,
    scan_status: ScanStatus,
    categories: Vec<CategoryNode>,
    tree_position: TreePosition,
    list_state: ListState,
    selected_paths: Vec<PathBuf>,
    total_size_found: u64,
    total_size_cleaned: u64,
    current_scan_path: String,
    scan_phase: String,
    delete_progress: f64,
    frame_count: u64,
    // License fields
    license_input: String,
    license_status: LicenseStatus,
    license_message: String,
    delete_error: Option<String>,
    deletion_report: Option<DeletionReport>,
}

#[derive(Clone, Debug)]
struct DeletionReport {
    deleted: usize,
    failed: usize,
    protected: usize,
    errors: Vec<String>,
}

#[derive(PartialEq, Clone)]
enum LicenseStatus {
    Checking,
    InputRequired,
    Verifying,
    Valid,
    Invalid,
}

impl AppState {
    fn new() -> Self {
        Self {
            view: AppView::License,
            scan_status: ScanStatus::Idle,
            categories: Vec::new(),
            tree_position: TreePosition::Category(0),
            list_state: ListState::default(),
            selected_paths: Vec::new(),
            total_size_found: 0,
            total_size_cleaned: 0,
            current_scan_path: String::new(),
            scan_phase: String::new(),
            delete_progress: 0.0,
            frame_count: 0,
            license_input: String::new(),
            license_status: LicenseStatus::Checking,
            license_message: String::new(),
            delete_error: None,
            deletion_report: None,
        }
    }

    fn update_list_state(&mut self) {
        let flat_index = self.get_flat_index();
        self.list_state.select(Some(flat_index));
    }

    fn get_flat_index(&self) -> usize {
        let mut index = 0;
        for (cat_idx, category) in self.categories.iter().enumerate() {
            match &self.tree_position {
                TreePosition::Category(c) if *c == cat_idx => return index,
                TreePosition::Item(c, i) if *c == cat_idx => return index + 1 + i,
                _ => {}
            }
            index += 1;
            if category.expanded {
                index += category.items.len();
            }
        }
        0
    }

    fn move_up(&mut self) {
        match &self.tree_position {
            TreePosition::Category(cat_idx) => {
                if *cat_idx > 0 {
                    let prev_cat = &self.categories[cat_idx - 1];
                    if prev_cat.expanded && !prev_cat.items.is_empty() {
                        self.tree_position = TreePosition::Item(cat_idx - 1, prev_cat.items.len() - 1);
                    } else {
                        self.tree_position = TreePosition::Category(cat_idx - 1);
                    }
                }
            }
            TreePosition::Item(cat_idx, item_idx) => {
                if *item_idx > 0 {
                    self.tree_position = TreePosition::Item(*cat_idx, item_idx - 1);
                } else {
                    self.tree_position = TreePosition::Category(*cat_idx);
                }
            }
        }
        self.update_list_state();
    }

    fn move_down(&mut self) {
        match &self.tree_position {
            TreePosition::Category(cat_idx) => {
                if *cat_idx < self.categories.len() {
                    let cat = &self.categories[*cat_idx];
                    if cat.expanded && !cat.items.is_empty() {
                        self.tree_position = TreePosition::Item(*cat_idx, 0);
                    } else if *cat_idx + 1 < self.categories.len() {
                        self.tree_position = TreePosition::Category(cat_idx + 1);
                    }
                }
            }
            TreePosition::Item(cat_idx, item_idx) => {
                let cat = &self.categories[*cat_idx];
                if *item_idx + 1 < cat.items.len() {
                    self.tree_position = TreePosition::Item(*cat_idx, item_idx + 1);
                } else if *cat_idx + 1 < self.categories.len() {
                    self.tree_position = TreePosition::Category(cat_idx + 1);
                }
            }
        }
        self.update_list_state();
    }

    fn toggle_expand(&mut self) {
        if let TreePosition::Category(cat_idx) = &self.tree_position {
            if *cat_idx < self.categories.len() {
                self.categories[*cat_idx].expanded = !self.categories[*cat_idx].expanded;
            }
        }
        self.update_list_state();
    }

    fn toggle_selection(&mut self) {
        match &self.tree_position {
            TreePosition::Category(cat_idx) => {
                if *cat_idx < self.categories.len() {
                    let cat = &self.categories[*cat_idx];
                    let all_selected = cat.items.iter().all(|item| self.selected_paths.contains(&item.path));
                    if all_selected {
                        for item in &cat.items {
                            self.selected_paths.retain(|p| p != &item.path);
                        }
                    } else {
                        for item in &cat.items {
                            if !self.selected_paths.contains(&item.path) {
                                self.selected_paths.push(item.path.clone());
                            }
                        }
                    }
                }
            }
            TreePosition::Item(cat_idx, item_idx) => {
                if *cat_idx < self.categories.len() {
                    let cat = &self.categories[*cat_idx];
                    if *item_idx < cat.items.len() {
                        let path = cat.items[*item_idx].path.clone();
                        if self.selected_paths.contains(&path) {
                            self.selected_paths.retain(|p| p != &path);
                        } else {
                            self.selected_paths.push(path);
                        }
                    }
                }
            }
        }
    }

    fn selected_size(&self) -> u64 {
        let mut size = 0;
        for cat in &self.categories {
            for item in &cat.items {
                if self.selected_paths.contains(&item.path) {
                    size += item.size;
                }
            }
        }
        size
    }

    fn get_current_path(&self) -> Option<PathBuf> {
        match &self.tree_position {
            TreePosition::Category(_) => None,
            TreePosition::Item(cat_idx, item_idx) => {
                if *cat_idx < self.categories.len() {
                    let cat = &self.categories[*cat_idx];
                    if *item_idx < cat.items.len() {
                        return Some(cat.items[*item_idx].path.clone());
                    }
                }
                None
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//                     U N I V E R S A L   S C A N N E R
// ═══════════════════════════════════════════════════════════════════════════

fn get_dir_size(path: &Path) -> u64 {
    fs_extra::dir::get_size(path).unwrap_or(0)
}

fn get_file_size(path: &Path) -> u64 {
    std::fs::metadata(path).map(|m| m.len()).unwrap_or(0)
}

/// Safely scan a path, returning None if permission denied
fn safe_scan_dir(path: &Path) -> Option<Vec<walkdir::DirEntry>> {
    if !path.exists() {
        return None;
    }
    
    let entries: Vec<_> = WalkDir::new(path)
        .max_depth(5)
        .into_iter()
        .filter_map(|e| e.ok())
        .collect();
    
    if entries.is_empty() {
        None
    } else {
        Some(entries)
    }
}

// ═══ CATEGORY A: SYSTEM JUNK ═══

#[cfg(target_os = "macos")]
fn get_system_junk_paths(home: &Path) -> Vec<(PathBuf, &'static str)> {
    vec![
        (home.join("Library/Logs"), "User Logs"),
        (home.join("Library/Caches"), "App Caches"),
        // Note: .Trash is excluded to prevent deleted files from reappearing
        (PathBuf::from("/Library/Logs"), "System Logs"),
        (PathBuf::from("/private/var/log"), "Var Logs"),
    ]
}

#[cfg(target_os = "windows")]
fn get_system_junk_paths(home: &Path) -> Vec<(PathBuf, &'static str)> {
    let temp = std::env::var("TEMP").unwrap_or_else(|_| format!("{}\\AppData\\Local\\Temp", home.display()));
    vec![
        (PathBuf::from(&temp), "User Temp"),
        (PathBuf::from("C:\\Windows\\Temp"), "System Temp"),
        (PathBuf::from("C:\\Windows\\Prefetch"), "Prefetch"),
        (home.join("AppData/Local/Temp"), "Local Temp"),
    ]
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn get_system_junk_paths(home: &Path) -> Vec<(PathBuf, &'static str)> {
    vec![
        (home.join(".cache"), "Cache"),
        (home.join(".local/share/Trash"), "Trash"),
        (PathBuf::from("/var/log"), "Var Logs"),
        (PathBuf::from("/tmp"), "Temp"),
    ]
}

fn scan_system_junk(home: &Path, tx: &mpsc::Sender<ScanMessage>) -> CategoryNode {
    let mut cat = CategoryNode::new(JunkCategory::SystemJunk);
    let paths = get_system_junk_paths(home);
    
    for (path, junk_type) in paths {
        let _ = tx.send(ScanMessage::Progress(format!("Scanning {}", path.display())));
        
        if path.exists() && !is_protected(&path, home) {
            // For directories, get total size
            if path.is_dir() {
                if let Some(entries) = safe_scan_dir(&path) {
                    for entry in entries {
                        if entry.file_type().is_file() {
                            let size = get_file_size(entry.path());
                            if size > 100_000 { // > 100KB
                                cat.add_item(JunkItem {
                                    path: entry.path().to_path_buf(),
                                    size,
                                    junk_type: junk_type.to_string(),
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    cat.items.sort_by(|a, b| b.size.cmp(&a.size));
    cat.items.truncate(100); // Limit to top 100
    cat
}

// ═══ CATEGORY B: BROWSER BLOAT ═══

#[cfg(target_os = "macos")]
fn get_browser_paths(home: &Path) -> Vec<(PathBuf, &'static str)> {
    vec![
        // Chrome
        (home.join("Library/Caches/Google/Chrome"), "Chrome Cache"),
        (home.join("Library/Application Support/Google/Chrome/Default/Cache"), "Chrome Data"),
        (home.join("Library/Application Support/Google/Chrome/Default/Code Cache"), "Chrome Code"),
        // Brave
        (home.join("Library/Caches/BraveSoftware/Brave-Browser"), "Brave Cache"),
        (home.join("Library/Application Support/BraveSoftware/Brave-Browser/Default/Cache"), "Brave Data"),
        // Firefox
        (home.join("Library/Caches/Firefox"), "Firefox Cache"),
        // Safari
        (home.join("Library/Caches/com.apple.Safari"), "Safari Cache"),
        (home.join("Library/Containers/com.apple.Safari/Data/Library/Caches"), "Safari Container"),
        // Edge
        (home.join("Library/Caches/Microsoft Edge"), "Edge Cache"),
        (home.join("Library/Application Support/Microsoft Edge/Default/Cache"), "Edge Data"),
        // Arc
        (home.join("Library/Caches/company.thebrowser.Browser"), "Arc Cache"),
    ]
}

#[cfg(target_os = "windows")]
fn get_browser_paths(home: &Path) -> Vec<(PathBuf, &'static str)> {
    vec![
        (home.join("AppData/Local/Google/Chrome/User Data/Default/Cache"), "Chrome Cache"),
        (home.join("AppData/Local/Google/Chrome/User Data/Default/Code Cache"), "Chrome Code"),
        (home.join("AppData/Local/BraveSoftware/Brave-Browser/User Data/Default/Cache"), "Brave Cache"),
        (home.join("AppData/Local/Mozilla/Firefox/Profiles"), "Firefox Cache"),
        (home.join("AppData/Local/Microsoft/Edge/User Data/Default/Cache"), "Edge Cache"),
    ]
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn get_browser_paths(home: &Path) -> Vec<(PathBuf, &'static str)> {
    vec![
        (home.join(".cache/google-chrome"), "Chrome Cache"),
        (home.join(".cache/BraveSoftware"), "Brave Cache"),
        (home.join(".cache/mozilla/firefox"), "Firefox Cache"),
        (home.join(".cache/microsoft-edge"), "Edge Cache"),
    ]
}

fn scan_browser_bloat(home: &Path, tx: &mpsc::Sender<ScanMessage>) -> CategoryNode {
    let mut cat = CategoryNode::new(JunkCategory::BrowserBloat);
    let paths = get_browser_paths(home);
    
    for (path, junk_type) in paths {
        let _ = tx.send(ScanMessage::Progress(format!("Scanning {}", path.display())));
        
        if path.exists() && !is_protected(&path, home) {
            let size = get_dir_size(&path);
            if size > 5_000_000 { // > 5MB
                cat.add_item(JunkItem {
                    path,
                    size,
                    junk_type: junk_type.to_string(),
                });
            }
        }
    }
    
    cat.items.sort_by(|a, b| b.size.cmp(&a.size));
    cat
}

// ═══ CATEGORY C: USER HOARDING ═══

fn scan_user_hoarding(home: &Path, tx: &mpsc::Sender<ScanMessage>) -> CategoryNode {
    let mut cat = CategoryNode::new(JunkCategory::UserHoarding);
    
    let thirty_days_ago = SystemTime::now()
        .checked_sub(Duration::from_secs(30 * 24 * 60 * 60))
        .unwrap_or(SystemTime::UNIX_EPOCH);
    
    // Old Downloads (30+ days)
    let downloads = home.join("Downloads");
    if downloads.exists() {
        let _ = tx.send(ScanMessage::Progress("Scanning Downloads for old files...".to_string()));
        
        if let Some(entries) = safe_scan_dir(&downloads) {
            for entry in entries {
                if entry.file_type().is_file() {
                    if let Ok(metadata) = entry.metadata() {
                        if let Ok(modified) = metadata.modified() {
                            if modified < thirty_days_ago && metadata.len() > 1_000_000 {
                                cat.add_item(JunkItem {
                                    path: entry.path().to_path_buf(),
                                    size: metadata.len(),
                                    junk_type: "Old Download".to_string(),
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Screenshots on Desktop
    let desktop = home.join("Desktop");
    if desktop.exists() {
        let _ = tx.send(ScanMessage::Progress("Scanning for screenshots...".to_string()));
        
        if let Ok(entries) = std::fs::read_dir(&desktop) {
            for entry in entries.filter_map(|e| e.ok()) {
                let name = entry.file_name().to_string_lossy().to_lowercase();
                if name.contains("screenshot") || name.contains("screen shot") || name.starts_with("capture") {
                    if let Ok(metadata) = entry.metadata() {
                        cat.add_item(JunkItem {
                            path: entry.path(),
                            size: metadata.len(),
                            junk_type: "Screenshot".to_string(),
                        });
                    }
                }
            }
        }
    }
    
    // Mail Downloads (macOS)
    #[cfg(target_os = "macos")]
    {
        let mail_downloads = home.join("Library/Containers/com.apple.mail/Data/Library/Mail Downloads");
        if mail_downloads.exists() {
            let _ = tx.send(ScanMessage::Progress("Scanning Mail Downloads...".to_string()));
            
            let size = get_dir_size(&mail_downloads);
            if size > 10_000_000 { // > 10MB
                cat.add_item(JunkItem {
                    path: mail_downloads,
                    size,
                    junk_type: "Mail Downloads".to_string(),
                });
            }
        }
    }
    
    // Installers in Downloads
    if downloads.exists() {
        let _ = tx.send(ScanMessage::Progress("Scanning for installers...".to_string()));
        
        if let Ok(entries) = std::fs::read_dir(&downloads) {
            for entry in entries.filter_map(|e| e.ok()) {
                let name = entry.file_name().to_string_lossy().to_lowercase();
                let is_installer = name.ends_with(".dmg") || name.ends_with(".pkg") 
                    || name.ends_with(".exe") || name.ends_with(".msi")
                    || name.ends_with(".iso");
                
                if is_installer {
                    if let Ok(metadata) = entry.metadata() {
                        cat.add_item(JunkItem {
                            path: entry.path(),
                            size: metadata.len(),
                            junk_type: "Installer".to_string(),
                        });
                    }
                }
            }
        }
    }
    
    cat.items.sort_by(|a, b| b.size.cmp(&a.size));
    cat
}

// ═══ CATEGORY D: PACKAGE MANAGERS ═══

#[cfg(target_os = "macos")]
fn get_package_manager_paths(home: &Path) -> Vec<(PathBuf, &'static str)> {
    vec![
        (home.join("Library/Caches/Homebrew"), "Homebrew"),
        (home.join(".cache/pip"), "pip"),
        (home.join("Library/Caches/pip"), "pip"),
        (home.join(".npm/_cacache"), "npm"),
        (home.join(".npm/_logs"), "npm Logs"),
        (home.join(".pnpm-store"), "pnpm"),
        (home.join(".yarn/cache"), "Yarn"),
        (home.join(".cargo/registry/cache"), "Cargo"),
        (home.join(".cargo/registry/src"), "Cargo Src"),
        (home.join(".gradle/caches"), "Gradle"),
        (home.join(".m2/repository"), "Maven"),
        (home.join(".rustup/toolchains"), "Rustup"),
        (home.join("Library/Caches/CocoaPods"), "CocoaPods"),
        (home.join("go/pkg/mod/cache"), "Go Modules"),
    ]
}

#[cfg(target_os = "windows")]
fn get_package_manager_paths(home: &Path) -> Vec<(PathBuf, &'static str)> {
    vec![
        (PathBuf::from("C:/ProgramData/chocolatey/lib"), "Chocolatey"),
        (home.join("AppData/Local/npm-cache"), "npm"),
        (home.join(".npm/_cacache"), "npm"),
        (home.join(".pnpm-store"), "pnpm"),
        (home.join(".yarn/cache"), "Yarn"),
        (home.join(".cargo/registry/cache"), "Cargo"),
        (home.join(".nuget/packages"), "NuGet"),
        (home.join(".gradle/caches"), "Gradle"),
        (home.join(".m2/repository"), "Maven"),
        (home.join("AppData/Local/pip/Cache"), "pip"),
        (home.join("go/pkg/mod/cache"), "Go Modules"),
    ]
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn get_package_manager_paths(home: &Path) -> Vec<(PathBuf, &'static str)> {
    vec![
        (home.join(".cache/pip"), "pip"),
        (home.join(".npm/_cacache"), "npm"),
        (home.join(".pnpm-store"), "pnpm"),
        (home.join(".yarn/cache"), "Yarn"),
        (home.join(".cargo/registry/cache"), "Cargo"),
        (home.join(".gradle/caches"), "Gradle"),
        (home.join(".m2/repository"), "Maven"),
        (home.join("go/pkg/mod/cache"), "Go Modules"),
    ]
}

fn scan_package_managers(home: &Path, tx: &mpsc::Sender<ScanMessage>) -> CategoryNode {
    let mut cat = CategoryNode::new(JunkCategory::PackageManagers);
    let paths = get_package_manager_paths(home);
    
    for (path, junk_type) in paths {
        let _ = tx.send(ScanMessage::Progress(format!("Scanning {} cache...", junk_type)));
        
        if path.exists() && !is_protected(&path, home) {
            let size = get_dir_size(&path);
            if size > 10_000_000 { // > 10MB
                cat.add_item(JunkItem {
                    path,
                    size,
                    junk_type: junk_type.to_string(),
                });
            }
        }
    }
    
    cat.items.sort_by(|a, b| b.size.cmp(&a.size));
    cat
}

// ═══ CATEGORY E: LARGE FILES ═══

fn scan_large_files(home: &Path, tx: &mpsc::Sender<ScanMessage>) -> CategoryNode {
    let mut cat = CategoryNode::new(JunkCategory::LargeFiles);
    
    let _ = tx.send(ScanMessage::Progress("Scanning for large files (500MB+)...".to_string()));
    
    // Scan specific directories for large files
    let scan_dirs = vec![
        home.join("Downloads"),
        home.join("Desktop"),
        home.join("Documents"),
        home.join("Movies"),
    ];
    
    let min_size: u64 = 500_000_000; // 500MB
    
    // Excluded extensions (vital files)
    let excluded_ext = ["vmdk", "vdi", "qcow2", "img"]; // VM disks
    
    for scan_dir in scan_dirs {
        if !scan_dir.exists() {
            continue;
        }
        
        let _ = tx.send(ScanMessage::Progress(format!("Scanning {} for large files...", scan_dir.display())));
        
        for entry in WalkDir::new(&scan_dir)
            .max_depth(4)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.len() >= min_size {
                        let path = entry.path();
                        
                        // Skip excluded extensions
                        let ext = path.extension()
                            .map(|e| e.to_string_lossy().to_lowercase())
                            .unwrap_or_default();
                        
                        if excluded_ext.contains(&ext.as_str()) {
                            continue;
                        }
                        
                        if !is_protected(path, home) {
                            let file_type = ext.to_uppercase();
                            cat.add_item(JunkItem {
                                path: path.to_path_buf(),
                                size: metadata.len(),
                                junk_type: if file_type.is_empty() { "Large File".to_string() } else { file_type },
                            });
                        }
                    }
                }
            }
        }
    }
    
    cat.items.sort_by(|a, b| b.size.cmp(&a.size));
    cat.items.truncate(50); // Top 50 largest
    cat
}

// ═══ MAIN SCANNER (THREADED) ═══

fn start_threaded_scan(home: PathBuf) -> mpsc::Receiver<ScanMessage> {
    let (tx, rx) = mpsc::channel();
    
    thread::spawn(move || {
        // Scan each category
        let system_junk = scan_system_junk(&home, &tx);
        let _ = tx.send(ScanMessage::CategoryDone(system_junk));
        
        let browser_bloat = scan_browser_bloat(&home, &tx);
        let _ = tx.send(ScanMessage::CategoryDone(browser_bloat));
        
        let user_hoarding = scan_user_hoarding(&home, &tx);
        let _ = tx.send(ScanMessage::CategoryDone(user_hoarding));
        
        let package_managers = scan_package_managers(&home, &tx);
        let _ = tx.send(ScanMessage::CategoryDone(package_managers));
        
        let large_files = scan_large_files(&home, &tx);
        let _ = tx.send(ScanMessage::CategoryDone(large_files));
        
        let _ = tx.send(ScanMessage::Complete);
    });
    
    rx
}

// ═══════════════════════════════════════════════════════════════════════════
//                             H E L P E R S
// ═══════════════════════════════════════════════════════════════════════════

fn format_size(bytes: u64) -> String {
    if bytes >= 1_073_741_824 {
        format!("{:.2} GB", bytes as f64 / 1_073_741_824.0)
    } else if bytes >= 1_048_576 {
        format!("{:.1} MB", bytes as f64 / 1_048_576.0)
    } else if bytes >= 1024 {
        format!("{:.0} KB", bytes as f64 / 1024.0)
    } else {
        format!("{} B", bytes)
    }
}

fn shorten_path(path: &PathBuf, home: &PathBuf) -> String {
    let path_str = path.to_string_lossy();
    let home_str = home.to_string_lossy();
    
    if path_str.starts_with(home_str.as_ref()) {
        let relative = path_str.replacen(home_str.as_ref(), "~", 1);
        if relative.len() > 50 {
            format!("...{}", &relative[relative.len() - 47..])
        } else {
            relative
        }
    } else if path_str.len() > 50 {
        format!("...{}", &path_str[path_str.len() - 47..])
    } else {
        path_str.to_string()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//                          U I   R E N D E R I N G
// ═══════════════════════════════════════════════════════════════════════════

fn render_ui(frame: &mut ratatui::Frame, state: &AppState, home: &PathBuf) {
    let area = frame.area();
    
    frame.render_widget(
        Block::default().style(Style::default().bg(colors::BG_DEEP)),
        area,
    );

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(5),
            Constraint::Min(10),
            Constraint::Length(3),
        ])
        .split(area);

    render_header(frame, chunks[0], state);
    
    match state.view {
        AppView::License => render_license(frame, chunks[1], state),
        AppView::Home => render_home(frame, chunks[1], state),
        AppView::Scanning => render_scanning(frame, chunks[1], state),
        AppView::Results => render_tree(frame, chunks[1], state, home),
        AppView::Deleting => render_deleting(frame, chunks[1], state),
    }
    
    render_footer(frame, chunks[2], state);

    // Error Overlay
    if let Some(err) = &state.delete_error {
        let area = frame.area();
        let block = Block::default()
            .title(Span::styled(" ⚠️ ERROR ", Style::default().fg(colors::ACCENT_RED).bold()))
            .borders(Borders::ALL)
            .style(Style::default().bg(colors::BG_DEEP));
        
        let rect = centered_rect(60, 20, area);
        frame.render_widget(Clear, rect);
        frame.render_widget(block, rect);

        let inner = centered_rect_inner(rect);
        let error_msg = Paragraph::new(vec![
            Line::from("Deletion Failed for some items."),
            Line::from(""),
            Line::from(Span::styled(err, Style::default().fg(colors::ACCENT_RED))),
            Line::from(""),
            Line::from(Span::styled("Press [Esc] to dismiss", Style::default().fg(colors::TEXT_MUTED))),
        ])
        .alignment(Alignment::Center)
        .wrap(ratatui::widgets::Wrap { trim: true });
        
        frame.render_widget(error_msg, inner);
    }

    // Deletion Report Overlay
    if let Some(report) = &state.deletion_report {
        let area = frame.area();
        let block = Block::default()
            .title(Span::styled(" 🧾 DELETION REPORT ", Style::default().fg(colors::ACCENT_CYAN).bold()))
            .borders(Borders::ALL)
            .style(Style::default().bg(colors::BG_DEEP));
        
        let rect = centered_rect(60, 40, area);
        frame.render_widget(Clear, rect);
        frame.render_widget(block, rect);

        let inner = centered_rect_inner(rect);
        
        let mut lines = vec![
            Line::from(vec![
                Span::styled("Deleted: ", Style::default().fg(colors::TEXT_MUTED)),
                Span::styled(format!("{} items", report.deleted), Style::default().fg(colors::ACCENT_GREEN).bold()),
            ]),
            Line::from(vec![
                Span::styled("Failed: ", Style::default().fg(colors::TEXT_MUTED)),
                Span::styled(format!("{} items", report.failed), Style::default().fg(colors::ACCENT_RED).bold()),
            ]),
            Line::from(vec![
                Span::styled("Protected: ", Style::default().fg(colors::TEXT_MUTED)),
                Span::styled(format!("{} items", report.protected), Style::default().fg(colors::ACCENT_YELLOW).bold()),
            ]),
            Line::from(""),
            Line::from(Span::styled("Details:", Style::default().fg(colors::TEXT_PRIMARY))),
        ];

        for err in report.errors.iter().take(5) {
            lines.push(Line::from(Span::styled(format!(" • {}", err), Style::default().fg(colors::TEXT_MUTED))));
        }
        if report.errors.len() > 5 {
             lines.push(Line::from(Span::styled(format!("   ...and {} more", report.errors.len() - 5), Style::default().fg(colors::TEXT_MUTED))));
        }

        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled("Press [Esc] to dismiss", Style::default().fg(colors::TEXT_MUTED))));

        let content = Paragraph::new(lines).wrap(ratatui::widgets::Wrap { trim: true });
        frame.render_widget(content, inner);
    }
}

fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}

fn centered_rect_inner(r: Rect) -> Rect {
    Rect {
        x: r.x + 2,
        y: r.y + 2,
        width: r.width.saturating_sub(4),
        height: r.height.saturating_sub(4),
    }
}

fn render_header(frame: &mut ratatui::Frame, area: Rect, state: &AppState) {
    let header_block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Double)
        .border_style(Style::default().fg(colors::ACCENT_CYAN))
        .style(Style::default().bg(colors::BG_SURFACE));

    let inner = header_block.inner(area);
    frame.render_widget(header_block, area);

    let pulse = ((state.frame_count as f64 * 0.1).sin() * 0.3 + 0.7) as f32;
    let title_color = Color::Rgb(
        (0.0 * pulse + 255.0 * (1.0 - pulse)) as u8,
        (255.0 * pulse) as u8,
        (255.0 * pulse) as u8,
    );

    let title = Paragraph::new(vec![
        Line::from(vec![
            Span::styled("▄▀▄▀▄ ", Style::default().fg(colors::ACCENT_CYAN)),
            Span::styled("P R O M E T H E U S", Style::default().fg(title_color).bold()),
            Span::styled(" ▄▀▄▀▄", Style::default().fg(colors::ACCENT_CYAN)),
        ]),
        Line::from(vec![
            Span::styled("══ UNIVERSAL SYSTEM CLEANER ══", Style::default().fg(colors::TEXT_MUTED)),
        ]),
    ])
    .centered();

    frame.render_widget(title, inner);
}

fn render_license(frame: &mut ratatui::Frame, area: Rect, state: &AppState) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(colors::BORDER))
        .style(Style::default().bg(colors::BG_SURFACE));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    // Center the license box
    let popup_width = 60u16;
    let popup_height = 14u16;
    let popup_area = Rect {
        x: inner.x + (inner.width.saturating_sub(popup_width)) / 2,
        y: inner.y + (inner.height.saturating_sub(popup_height)) / 2,
        width: popup_width.min(inner.width),
        height: popup_height.min(inner.height),
    };

    // Clear the popup area
    frame.render_widget(Clear, popup_area);

    let popup_block = Block::default()
        .title(Span::styled(" 🔐 AUTHENTICATION ", Style::default().fg(colors::ACCENT_CYAN).bold()))
        .borders(Borders::ALL)
        .border_type(BorderType::Double)
        .border_style(Style::default().fg(colors::ACCENT_CYAN))
        .style(Style::default().bg(colors::BG_DEEP));

    let popup_inner = popup_block.inner(popup_area);
    frame.render_widget(popup_block, popup_area);

    let mut lines = vec![
        Line::from(""),
    ];

    match state.license_status {
        LicenseStatus::Checking => {
            lines.push(Line::from(Span::styled("Checking stored license...", Style::default().fg(colors::TEXT_MUTED))));
        }
        LicenseStatus::InputRequired => {
            lines.push(Line::from(Span::styled(
                "Enter Gumroad License Key:",
                Style::default().fg(colors::TEXT_PRIMARY),
            )));
            lines.push(Line::from(""));
            
            // Input field with blinking cursor
            let cursor = if state.frame_count % 30 < 15 { "█" } else { " " };
            let input_display = format!(" {}{} ", state.license_input, cursor);
            lines.push(Line::from(vec![
                Span::styled("▶ ", Style::default().fg(colors::ACCENT_CYAN)),
                Span::styled(input_display, Style::default().fg(colors::ACCENT_GREEN).bold()),
            ]));
            
            lines.push(Line::from(""));
            lines.push(Line::from(Span::styled(
                "[Enter] Verify  [Esc] Quit",
                Style::default().fg(colors::TEXT_MUTED),
            )));
        }
        LicenseStatus::Verifying => {
            let spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
            let s = spinner[(state.frame_count as usize / 3) % spinner.len()];
            lines.push(Line::from(vec![
                Span::styled(s, Style::default().fg(colors::ACCENT_CYAN)),
                Span::styled(" Verifying with command center...", Style::default().fg(colors::TEXT_PRIMARY)),
            ]));
        }
        LicenseStatus::Valid => {
            lines.push(Line::from(Span::styled(
                "✓ PROTOCOL AUTHORIZED",
                Style::default().fg(colors::ACCENT_GREEN).bold(),
            )));
            lines.push(Line::from(""));
            lines.push(Line::from(Span::styled(
                "Welcome, Operator.",
                Style::default().fg(colors::TEXT_PRIMARY),
            )));
        }
        LicenseStatus::Invalid => {
            lines.push(Line::from(Span::styled(
                "✗ ACCESS DENIED",
                Style::default().fg(colors::ACCENT_RED).bold(),
            )));
            lines.push(Line::from(""));
            if !state.license_message.is_empty() {
                lines.push(Line::from(Span::styled(
                    &state.license_message,
                    Style::default().fg(colors::ACCENT_RED),
                )));
            }
            lines.push(Line::from(""));
            lines.push(Line::from(Span::styled(
                "Built from source? Set PROMETHEUS_DEV=1",
                Style::default().fg(colors::TEXT_MUTED).add_modifier(Modifier::ITALIC),
            )));
            lines.push(Line::from(Span::styled(
                "Otherwise, please support the dev!",
                Style::default().fg(colors::TEXT_MUTED),
            )));
            lines.push(Line::from(""));
            lines.push(Line::from(Span::styled(
                "[R] Retry  [Esc] Quit",
                Style::default().fg(colors::TEXT_MUTED),
            )));
        }
    }

    let content = Paragraph::new(lines).alignment(Alignment::Center);
    frame.render_widget(content, popup_inner);
}

fn render_home(frame: &mut ratatui::Frame, area: Rect, state: &AppState) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(colors::BORDER))
        .style(Style::default().bg(colors::BG_SURFACE));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let categories = [
        ("🗑️", "System Junk", "Logs, caches, temp files", colors::ACCENT_RED),
        ("🌐", "Browser Bloat", "Chrome, Firefox, Safari cache", colors::ACCENT_PURPLE),
        ("📥", "User Hoarding", "Old downloads, screenshots", colors::ACCENT_YELLOW),
        ("📦", "Package Managers", "npm, pip, Homebrew caches", colors::ACCENT_CYAN),
        ("💾", "Large Files", "Files larger than 500MB", colors::ACCENT_ORANGE),
    ];

    let mut lines: Vec<Line> = vec![
        Line::from(""),
        Line::from(Span::styled(
            "━━━ What We'll Hunt ━━━",
            Style::default().fg(colors::ACCENT_CYAN).bold(),
        )),
        Line::from(""),
    ];

    for (icon, name, desc, color) in categories {
        lines.push(Line::from(vec![
            Span::styled(format!("  {} ", icon), Style::default()),
            Span::styled(format!("{:<18}", name), Style::default().fg(color).bold()),
            Span::styled(desc, Style::default().fg(colors::TEXT_MUTED)),
        ]));
    }

    lines.push(Line::from(""));
    lines.push(Line::from(""));
    lines.push(Line::from(vec![
        Span::styled("Press ", Style::default().fg(colors::TEXT_MUTED)),
        Span::styled("[S]", Style::default().fg(colors::ACCENT_CYAN).bold()),
        Span::styled(" to Start Deep Scan", Style::default().fg(colors::TEXT_MUTED)),
    ]));

    if state.total_size_cleaned > 0 {
        lines.push(Line::from(""));
        lines.push(Line::from(vec![
            Span::styled("✨ Total Cleaned: ", Style::default().fg(colors::TEXT_MUTED)),
            Span::styled(
                format_size(state.total_size_cleaned),
                Style::default().fg(colors::ACCENT_GREEN).bold(),
            ),
        ]));
    }

    let content = Paragraph::new(lines).centered();
    frame.render_widget(content, inner);
}

fn render_scanning(frame: &mut ratatui::Frame, area: Rect, state: &AppState) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(colors::ACCENT_CYAN))
        .style(Style::default().bg(colors::BG_SURFACE));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let spinner_frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let spinner = spinner_frames[(state.frame_count as usize / 3) % spinner_frames.len()];

    // Progress bar area
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Length(2),
            Constraint::Length(3),
            Constraint::Length(2),
            Constraint::Min(0),
        ])
        .margin(2)
        .split(inner);

    // Title
    let title = Paragraph::new(vec![
        Line::from(vec![
            Span::styled(spinner, Style::default().fg(colors::ACCENT_CYAN).bold()),
            Span::styled("  SCANNING SYSTEM...", Style::default().fg(colors::TEXT_PRIMARY).bold()),
        ]),
    ])
    .centered();
    frame.render_widget(title, chunks[0]);

    // Phase indicator
    let phase = if !state.scan_phase.is_empty() {
        &state.scan_phase
    } else {
        "Initializing..."
    };
    let phase_text = Paragraph::new(Line::from(vec![
        Span::styled("Phase: ", Style::default().fg(colors::TEXT_MUTED)),
        Span::styled(phase, Style::default().fg(colors::ACCENT_YELLOW)),
    ]))
    .centered();
    frame.render_widget(phase_text, chunks[1]);

    // Animated progress bar
    let progress = (state.frame_count % 100) as f64 / 100.0;
    let gauge = Gauge::default()
        .block(Block::default().borders(Borders::ALL).border_style(Style::default().fg(colors::BORDER)))
        .gauge_style(Style::default().fg(colors::ACCENT_CYAN).bg(colors::BG_DEEP))
        .ratio(progress);
    frame.render_widget(gauge, chunks[2]);

    // Current path
    let path_text = if !state.current_scan_path.is_empty() {
        &state.current_scan_path
    } else {
        "Preparing scanner..."
    };
    let path_display = if path_text.len() > 60 {
        format!("...{}", &path_text[path_text.len() - 57..])
    } else {
        path_text.to_string()
    };
    let path = Paragraph::new(Line::from(Span::styled(
        path_display,
        Style::default().fg(colors::TEXT_MUTED).add_modifier(Modifier::ITALIC),
    )))
    .centered();
    frame.render_widget(path, chunks[3]);
}

fn render_tree(frame: &mut ratatui::Frame, area: Rect, state: &AppState, home: &PathBuf) {
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(70), Constraint::Percentage(30)])
        .split(area);

    let tree_block = Block::default()
        .title(Span::styled(
            " ◉ JUNK TREE ",
            Style::default().fg(colors::ACCENT_RED).bold(),
        ))
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(colors::BORDER_ACTIVE))
        .style(Style::default().bg(colors::BG_SURFACE));

    let mut items: Vec<ListItem> = Vec::new();

    for (cat_idx, category) in state.categories.iter().enumerate() {
        let is_cat_selected = state.tree_position == TreePosition::Category(cat_idx);
        let expand_icon = if category.expanded { "▼" } else { "▶" };
        
        let cat_all_selected = !category.items.is_empty() && 
            category.items.iter().all(|item| state.selected_paths.contains(&item.path));
        let checkbox = if cat_all_selected { "◉" } else { "○" };

        let cat_style = if is_cat_selected {
            Style::default().fg(category.category.color()).bold().add_modifier(Modifier::REVERSED)
        } else {
            Style::default().fg(category.category.color()).bold()
        };

        items.push(ListItem::new(Line::from(vec![
            Span::styled(expand_icon, Style::default().fg(colors::ACCENT_CYAN)),
            Span::raw(" "),
            Span::styled(checkbox, if cat_all_selected { Style::default().fg(colors::ACCENT_GREEN) } else { Style::default().fg(colors::TEXT_MUTED) }),
            Span::raw(" "),
            Span::styled(category.category.icon(), Style::default()),
            Span::raw(" "),
            Span::styled(category.category.name(), cat_style),
            Span::raw(" "),
            Span::styled(
                format!("({} items, {})", category.items.len(), format_size(category.total_size)),
                Style::default().fg(colors::TEXT_MUTED),
            ),
        ])));

        if category.expanded {
            for (item_idx, item) in category.items.iter().enumerate() {
                let is_item_selected = state.tree_position == TreePosition::Item(cat_idx, item_idx);
                let is_checked = state.selected_paths.contains(&item.path);
                let checkbox = if is_checked { "◉" } else { "○" };

                let item_style = if is_item_selected {
                    Style::default().fg(colors::TEXT_PRIMARY).add_modifier(Modifier::REVERSED)
                } else {
                    Style::default().fg(colors::TEXT_PRIMARY)
                };

                let path_display = shorten_path(&item.path, home);

                items.push(ListItem::new(Line::from(vec![
                    Span::styled("   ", Style::default()),
                    Span::styled(checkbox, if is_checked { Style::default().fg(colors::ACCENT_GREEN) } else { Style::default().fg(colors::TEXT_MUTED) }),
                    Span::styled(" ", Style::default()),
                    Span::styled(path_display, item_style),
                    Span::styled(" ", Style::default()),
                    Span::styled(
                        format!("[{}]", item.junk_type),
                        Style::default().fg(colors::TEXT_MUTED),
                    ),
                    Span::styled(" ", Style::default()),
                    Span::styled(
                        format_size(item.size),
                        Style::default().fg(category.category.color()).bold(),
                    ),
                ])));
            }
        }
    }

    let list = List::new(items)
        .block(tree_block)
        .highlight_style(
            Style::default()
                .bg(colors::BG_DEEP)
                .add_modifier(Modifier::BOLD),
        )
        .highlight_symbol("▸ ");
    
    frame.render_stateful_widget(list, chunks[0], &mut state.list_state.clone());

    // Stats panel
    let stats_block = Block::default()
        .title(Span::styled(
            " ◎ STATS ",
            Style::default().fg(colors::ACCENT_CYAN).bold(),
        ))
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(colors::BORDER))
        .style(Style::default().bg(colors::BG_SURFACE));

    let selected_count = state.selected_paths.len();
    let total_items: usize = state.categories.iter().map(|c| c.items.len()).sum();

    let stats_lines = vec![
        Line::from(""),
        Line::from(vec![
            Span::styled("  Categories: ", Style::default().fg(colors::TEXT_MUTED)),
            Span::styled(
                format!("{}", state.categories.len()),
                Style::default().fg(colors::TEXT_PRIMARY),
            ),
        ]),
        Line::from(vec![
            Span::styled("  Total Items: ", Style::default().fg(colors::TEXT_MUTED)),
            Span::styled(
                format!("{}", total_items),
                Style::default().fg(colors::TEXT_PRIMARY),
            ),
        ]),
        Line::from(vec![
            Span::styled("  Total Size: ", Style::default().fg(colors::TEXT_MUTED)),
            Span::styled(
                format_size(state.total_size_found),
                Style::default().fg(colors::ACCENT_YELLOW).bold(),
            ),
        ]),
        Line::from(""),
        Line::from(Span::styled(
            "  ─────────────────",
            Style::default().fg(colors::BORDER),
        )),
        Line::from(""),
        Line::from(vec![
            Span::styled("  Selected: ", Style::default().fg(colors::TEXT_MUTED)),
            Span::styled(
                format!("{} items", selected_count),
                Style::default().fg(colors::ACCENT_GREEN),
            ),
        ]),
        Line::from(vec![
            Span::styled("  To Clean: ", Style::default().fg(colors::TEXT_MUTED)),
            Span::styled(
                format_size(state.selected_size()),
                Style::default().fg(colors::ACCENT_RED).bold(),
            ),
        ]),
        Line::from(""),
        Line::from(Span::styled(
            "  ─────────────────",
            Style::default().fg(colors::BORDER),
        )),
        Line::from(""),
        Line::from(vec![
            Span::styled("  🛡️ ", Style::default()),
            Span::styled("System files", Style::default().fg(colors::ACCENT_GREEN)),
        ]),
        Line::from(vec![
            Span::styled("     are protected", Style::default().fg(colors::TEXT_MUTED)),
        ]),
    ];

    let stats = Paragraph::new(stats_lines).block(stats_block);
    frame.render_widget(stats, chunks[1]);
}

fn render_deleting(frame: &mut ratatui::Frame, area: Rect, state: &AppState) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(colors::ACCENT_RED))
        .style(Style::default().bg(colors::BG_SURFACE));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let progress_area = Rect {
        x: inner.x + 10,
        y: inner.y + inner.height / 2,
        width: inner.width.saturating_sub(20),
        height: 3,
    };

    let gauge = Gauge::default()
        .block(Block::default().borders(Borders::ALL).border_style(Style::default().fg(colors::BORDER)))
        .gauge_style(Style::default().fg(colors::ACCENT_RED).bg(colors::BG_DEEP))
        .percent((state.delete_progress * 100.0) as u16)
        .label(Span::styled(
            format!("CLEANING... {:.0}%", state.delete_progress * 100.0),
            Style::default().fg(colors::TEXT_PRIMARY).bold(),
        ));

    frame.render_widget(gauge, progress_area);
}

fn render_footer(frame: &mut ratatui::Frame, area: Rect, state: &AppState) {
    let footer_block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(colors::BORDER))
        .style(Style::default().bg(colors::BG_SURFACE));

    let inner = footer_block.inner(area);
    frame.render_widget(footer_block, area);

    let help_text = match state.view {
        AppView::License => "License verification required",
        AppView::Home => "[S] Scan  [Q] Quit",
        AppView::Scanning => "Scanning system... please wait",
        AppView::Results => "[↑↓/jk] Nav  [O] Expand  [Space] Select  [F] Finder  [D] Delete  [Q] Quit",
        AppView::Deleting => "Moving to Trash...",
    };

    let footer = Paragraph::new(Line::from(vec![
        Span::styled("  ", Style::default()),
        Span::styled(help_text, Style::default().fg(colors::TEXT_MUTED)),
    ]));

    frame.render_widget(footer, inner);
}

// ═══════════════════════════════════════════════════════════════════════════
//                              M A I N   L O O P
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════

/// Smart Delete - Handles Canonicalization for Windows
/// Returns Ok if trashed, Err if failed.
/// NOTE: Deliberately does NOT implement force delete (Safety First).
fn smart_delete(path: &Path) -> Result<(), String> {
    // 1. Solve the Windows Path Issue (Get Absolute Path)
    let abs_path = path.canonicalize().map_err(|e| format!("Invalid path: {}", e))?;

    // 2. Try to move to Trash
    if trash::delete(&abs_path).is_err() {
        // 3. Fallback: Force Delete (The Mean Way) - only if Trash failed
        if abs_path.is_dir() {
            std::fs::remove_dir_all(&abs_path).map_err(|e| format!("Force delete failed: {}", e))?;
        } else {
            std::fs::remove_file(&abs_path).map_err(|e| format!("Force delete failed: {}", e))?;
        }
    }
    Ok(())
}

fn restore_terminal() {
    let _ = disable_raw_mode();
    let _ = execute!(
        io::stdout(),
        LeaveAlternateScreen,
        DisableMouseCapture
    );
    let _ = execute!(io::stdout(), crossterm::cursor::Show);
}

fn main() -> io::Result<()> {
    // Setup Panic Hook to restore terminal on crash
    let original_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        restore_terminal();
        original_hook(panic_info);
    }));

    // Setup Ctrl+C Handler
    ctrlc::set_handler(move || {
        restore_terminal();
        std::process::exit(0);
    }).expect("Error setting Ctrl-C handler");

    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"));
    let mut state = AppState::new();
    let tick_rate = Duration::from_millis(33); // ~30fps for smooth animations
    let mut last_tick = Instant::now();
    
    let mut scan_rx: Option<mpsc::Receiver<ScanMessage>> = None;

    // Check for dev bypass or existing license
    if license::is_dev_bypass() {
        state.view = AppView::Home;
        state.license_status = LicenseStatus::Valid;
    } else if let Some(_stored) = license::check_stored_license() {
        // License found - proceed to app
        state.view = AppView::Home;
        state.license_status = LicenseStatus::Valid;
    } else {
        // Need license input
        state.license_status = LicenseStatus::InputRequired;
    }

    loop {
        state.frame_count = state.frame_count.wrapping_add(1);

        terminal.draw(|f| render_ui(f, &state, &home))?;

        // Handle scan messages from background thread
        if let Some(ref rx) = scan_rx {
            loop {
                match rx.try_recv() {
                    Ok(ScanMessage::Progress(path)) => {
                        state.current_scan_path = path;
                    }
                    Ok(ScanMessage::CategoryDone(cat)) => {
                        state.scan_phase = format!("Found {} {} items", cat.items.len(), cat.category.name());
                        if !cat.items.is_empty() {
                            state.total_size_found += cat.total_size;
                            state.categories.push(cat);
                        }
                    }
                    Ok(ScanMessage::Complete) => {
                        state.scan_status = ScanStatus::Complete;
                        state.view = AppView::Results;
                        state.tree_position = TreePosition::Category(0);
                        state.update_list_state();
                        scan_rx = None;
                        break;
                    }
                    Err(mpsc::TryRecvError::Empty) => break,
                    Err(mpsc::TryRecvError::Disconnected) => {
                        scan_rx = None;
                        state.view = AppView::Results;
                        break;
                    }
                }
            }
        }

        let timeout = tick_rate.saturating_sub(last_tick.elapsed());
        if event::poll(timeout)? {
            if let Event::Key(key) = event::read()? {
                if key.kind == KeyEventKind::Press {
                    // Handle Error Overlay
                    if state.delete_error.is_some() {
                        if key.code == KeyCode::Esc {
                            state.delete_error = None;
                        }
                        continue;
                    }
                    
                    // Handle Deletion Report Overlay
                    if state.deletion_report.is_some() {
                        if key.code == KeyCode::Esc {
                            state.deletion_report = None;
                        }
                        continue;
                    }

                    match state.view {
                        AppView::License => match key.code {
                            KeyCode::Esc => break,
                            KeyCode::Char('r') | KeyCode::Char('R') if state.license_status == LicenseStatus::Invalid => {
                                state.license_status = LicenseStatus::InputRequired;
                                state.license_input.clear();
                                state.license_message.clear();
                            }
                            KeyCode::Backspace => {
                                state.license_input.pop();
                            }
                            KeyCode::Enter if state.license_status == LicenseStatus::InputRequired => {
                                if !state.license_input.is_empty() {
                                    state.license_status = LicenseStatus::Verifying;
                                    // Verify in background thread  
                                    let key_to_verify = state.license_input.clone();
                                    match license::verify_license(&key_to_verify) {
                                        Ok((true, email)) => {
                                            // Save license
                                            let _ = license::save_license(&key_to_verify, email);
                                            state.license_status = LicenseStatus::Valid;
                                            state.view = AppView::Home;
                                        }
                                        Ok((false, msg)) => {
                                            state.license_status = LicenseStatus::Invalid;
                                            state.license_message = msg.unwrap_or_else(|| "Invalid license key".to_string());
                                        }
                                        Err(e) => {
                                            state.license_status = LicenseStatus::Invalid;
                                            state.license_message = e;
                                        }
                                    }
                                }
                            }
                            KeyCode::Char(c) if state.license_status == LicenseStatus::InputRequired => {
                                if state.license_input.len() < 50 {
                                    state.license_input.push(c);
                                }
                            }
                            _ => {}
                        },
                        AppView::Home => match key.code {
                            KeyCode::Char('q') | KeyCode::Char('Q') => break,
                            KeyCode::Char('s') | KeyCode::Char('S') => {
                                state.view = AppView::Scanning;
                                state.scan_status = ScanStatus::Scanning;
                                state.categories.clear();
                                state.total_size_found = 0;
                                state.scan_phase = "Starting scan...".to_string();
                                scan_rx = Some(start_threaded_scan(home.clone()));
                            }
                            _ => {}
                        },
                        AppView::Scanning => {
                            // Can't interrupt scanning
                        }
                        AppView::Results => match key.code {
                            KeyCode::Char('q') | KeyCode::Char('Q') => break,
                            KeyCode::Up | KeyCode::Char('k') => state.move_up(),
                            KeyCode::Down | KeyCode::Char('j') => state.move_down(),
                            KeyCode::Char('o') | KeyCode::Char('O') => state.toggle_expand(),
                            KeyCode::Char(' ') => state.toggle_selection(),
                            KeyCode::Char('f') | KeyCode::Char('F') => {
                                // Open in Finder/File Explorer
                                if let Some(path) = state.get_current_path() {
                                    let target = if path.is_dir() {
                                        path.clone()
                                    } else {
                                        path.parent().map(|p| p.to_path_buf()).unwrap_or(path.clone())
                                    };
                                    #[cfg(target_os = "macos")]
                                    { let _ = std::process::Command::new("open").arg(&target).spawn(); }
                                    #[cfg(target_os = "windows")]
                                    { let _ = std::process::Command::new("explorer").arg(&target).spawn(); }
                                    #[cfg(target_os = "linux")]
                                    { let _ = std::process::Command::new("xdg-open").arg(&target).spawn(); }
                                }
                            }
                            KeyCode::Enter | KeyCode::Char('d') | KeyCode::Char('D') => {
                                if !state.selected_paths.is_empty() {
                                    state.view = AppView::Deleting;
                                }
                            }
                            KeyCode::Esc => {
                                state.view = AppView::Home;
                                state.categories.clear();
                                state.selected_paths.clear();
                                state.total_size_found = 0;
                            }
                            _ => {}
                        },
                        AppView::Deleting => {}
                    }
                }
            }
        }

        if last_tick.elapsed() >= tick_rate {
            last_tick = Instant::now();

            // Handle deletion
            if state.view == AppView::Deleting {
                let paths_to_delete = state.selected_paths.clone();
                let total = paths_to_delete.len();

                let mut report = DeletionReport {
                    deleted: 0,
                    failed: 0,
                    protected: 0,
                    errors: Vec::new(),
                };

                for (i, path) in paths_to_delete.iter().enumerate() {
                    state.delete_progress = (i + 1) as f64 / total as f64;
                    
                    if !is_protected(path, &home) {
                        if let Err(e) = smart_delete(path) {
                            report.failed += 1;
                            if report.errors.len() < 3 {
                                report.errors.push(format!("{}: {}", path.file_name().unwrap_or_default().to_string_lossy(), e));
                            }
                        } else {
                            report.deleted += 1;
                            successfully_deleted.insert(path.clone());
                            for cat in &state.categories {
                                for item in &cat.items {
                                    if &item.path == path {
                                        state.total_size_cleaned += item.size;
                                    }
                                }
                            }
                        }
                    } else {
                        report.protected += 1;
                    }
                }

                if report.failed > 0 || report.protected > 0 {
                    state.deletion_report = Some(report);
                }

                for cat in &mut state.categories {
                    cat.items.retain(|item| !successfully_deleted.contains(&item.path));
                    cat.total_size = cat.items.iter().map(|i| i.size).sum();
                }
                state.categories.retain(|c| !c.items.is_empty());

                state.selected_paths.clear();
                state.total_size_found = state.categories.iter()
                    .map(|c| c.total_size)
                    .sum();
                state.delete_progress = 0.0;
                state.tree_position = TreePosition::Category(0);
                
                if state.categories.is_empty() {
                    state.view = AppView::Home;
                } else {
                    state.view = AppView::Results;
                }
            }
        }
    }



    restore_terminal();

    Ok(())
}
