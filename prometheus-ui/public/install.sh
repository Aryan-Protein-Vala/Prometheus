#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  PROMETHEUS INSTALLER
#  Your OS. Surgically Clean.
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Minimal Colors (matching website aesthetic)
WHITE='\033[1;37m'
GRAY='\033[0;90m'
DIM='\033[2m'
NC='\033[0m'

# Version
VERSION="1.0.0"
INSTALL_PATH="/usr/local/bin/prometheus"

# GitHub Release URL - UPDATE THIS WITH YOUR ACTUAL RELEASE!
# Format: https://github.com/USERNAME/REPO/releases/latest/download
GITHUB_REPO="Aryan-Protein-Vala/Prometheus"
GITHUB_URL="https://github.com/${GITHUB_REPO}/releases/latest/download"

# ═══ MINIMAL PRINT FUNCTIONS ═══

print_header() {
    echo ""
    echo -e "${WHITE}  PROMETHEUS${NC}"
    echo -e "${GRAY}  ─────────────────────────────────────${NC}"
    echo -e "${DIM}  Your OS. Surgically Clean.${NC}"
    echo ""
}

print_step() {
    echo -e "${GRAY}  ◦${NC} $1"
}

print_done() {
    echo -e "${WHITE}  ✓${NC} $1"
}

print_error() {
    echo -e "${WHITE}  ✗${NC} $1"
}

print_dim() {
    echo -e "${DIM}    $1${NC}"
}

# ═══ MAIN INSTALLER ═══

main() {
    clear
    print_header

    # Check for existing installation
    if [ -f "$INSTALL_PATH" ]; then
        EXISTING_VERSION=$("$INSTALL_PATH" --version 2>/dev/null || echo "unknown")
        print_step "Existing installation found: $EXISTING_VERSION"
        print_step "Updating to latest version..."
        echo ""
    else
        print_step "Fresh installation..."
        echo ""
    fi

    # Detect OS
    print_step "Detecting system..."
    
    OS="unknown"
    BINARY_NAME=""
    
    case "$(uname -s)" in
        Darwin*)
            OS="macos"
            ARCH=$(uname -m)
            if [ "$ARCH" = "arm64" ]; then
                BINARY_NAME="prometheus-macos-arm64"
                print_dim "macOS (Apple Silicon)"
            else
                BINARY_NAME="prometheus-macos-x64"
                print_dim "macOS (Intel)"
            fi
            ;;
        Linux*)
            OS="linux"
            BINARY_NAME="prometheus-linux-x64"
            print_dim "Linux (x64)"
            ;;
        *)
            print_error "Unsupported: $(uname -s)"
            print_dim "Use Windows installer or build from source."
            exit 1
            ;;
    esac

    # Download
    print_step "Downloading binary..."
    
    DOWNLOAD_URL="${GITHUB_URL}/${BINARY_NAME}"
    TEMP_PATH="/tmp/prometheus-download-$$"
    
    DOWNLOAD_SUCCESS=false
    
    # Try download from GitHub
    if command -v curl &> /dev/null; then
        HTTP_CODE=$(curl -sL -w "%{http_code}" -o "$TEMP_PATH" "$DOWNLOAD_URL" 2>/dev/null)
        if [ "$HTTP_CODE" = "200" ] && [ -s "$TEMP_PATH" ]; then
            # Verify it's not HTML (check for binary)
            if ! head -c 20 "$TEMP_PATH" 2>/dev/null | grep -q "<!DOCTYPE\|<html\|Not Found"; then
                DOWNLOAD_SUCCESS=true
                print_dim "Downloaded from GitHub"
            fi
        fi
    elif command -v wget &> /dev/null; then
        if wget -q -O "$TEMP_PATH" "$DOWNLOAD_URL" 2>/dev/null; then
            if ! head -c 20 "$TEMP_PATH" 2>/dev/null | grep -q "<!DOCTYPE\|<html\|Not Found"; then
                DOWNLOAD_SUCCESS=true
                print_dim "Downloaded from GitHub"
            fi
        fi
    fi
    
    # Fallback: Check for local build (dev mode)
    if [ "$DOWNLOAD_SUCCESS" = false ]; then
        rm -f "$TEMP_PATH" 2>/dev/null
        
        # Check common local paths
        LOCAL_PATHS=(
            "./target/release/prometheus"
            "../prometheus-tui/target/release/prometheus"
            "$HOME/Desktop/Prometheus/prometheus-tui/target/release/prometheus"
        )
        
        for LOCAL_PATH in "${LOCAL_PATHS[@]}"; do
            if [ -f "$LOCAL_PATH" ]; then
                cp "$LOCAL_PATH" "$TEMP_PATH"
                DOWNLOAD_SUCCESS=true
                print_dim "Using local build (dev mode)"
                break
            fi
        done
    fi
    
    if [ "$DOWNLOAD_SUCCESS" = false ]; then
        print_error "Download failed"
        echo ""
        print_dim "The binary is not yet available for download."
        print_dim "Please build from source:"
        echo ""
        echo -e "${GRAY}    git clone https://github.com/${GITHUB_REPO}.git${NC}"
        echo -e "${GRAY}    cd prometheus/prometheus-tui${NC}"
        echo -e "${GRAY}    cargo build --release${NC}"
        echo -e "${GRAY}    sudo cp target/release/prometheus /usr/local/bin/${NC}"
        echo ""
        exit 1
    fi

    # macOS: Remove quarantine
    if [ "$OS" = "macos" ] && [ -f "$TEMP_PATH" ]; then
        xattr -d com.apple.quarantine "$TEMP_PATH" 2>/dev/null || true
    fi

    # Make executable
    chmod +x "$TEMP_PATH" 2>/dev/null || true

    # Install (overwrite existing)
    print_step "Installing..."
    
    if [ -f "$TEMP_PATH" ]; then
        if [ -w "/usr/local/bin" ]; then
            mv -f "$TEMP_PATH" "$INSTALL_PATH"
        else
            print_dim "Requesting admin access..."
            sudo mv -f "$TEMP_PATH" "$INSTALL_PATH"
        fi
        
        if [ $? -eq 0 ]; then
            print_done "Installed to /usr/local/bin/prometheus"
        else
            print_error "Installation failed"
            exit 1
        fi
    fi

    # Cleanup
    rm -f "$TEMP_PATH" 2>/dev/null

    # For macOS: Reset terminal to fix mouse tracking from previous prometheus runs
    # This is needed because the old binary might have left terminal in raw mode
    if [ "$OS" = "macos" ]; then
        # Disable all mouse tracking modes
        printf '\033[?1000l' 2>/dev/null  # Disable mouse click tracking
        printf '\033[?1002l' 2>/dev/null  # Disable mouse drag tracking  
        printf '\033[?1003l' 2>/dev/null  # Disable all mouse tracking
        printf '\033[?1006l' 2>/dev/null  # Disable SGR mouse mode
        printf '\033[?25h' 2>/dev/null    # Show cursor
        printf '\033c' 2>/dev/null        # Full terminal reset
        stty sane 2>/dev/null || true
        
        # Run reset and then print message
        reset
        echo ""
        echo "  ✓ Download complete. Type 'prometheus' to run the cleaner."
        echo ""
    else
        # Success message for other platforms
        echo ""
        echo -e "${GRAY}  ─────────────────────────────────────${NC}"
        echo ""
        echo -e "${WHITE}  Installation complete.${NC}"
        echo ""
        echo -e "${DIM}  Run:${NC} ${WHITE}prometheus${NC}"
        echo ""
    fi
}

main "$@"
