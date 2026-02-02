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

# GitHub Release URL
GITHUB_URL="https://github.com/YOUR_USERNAME/prometheus/releases/latest/download"

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
    TEMP_PATH="/tmp/prometheus-download"
    
    # Try download
    if command -v curl &> /dev/null; then
        curl -sSL -o "$TEMP_PATH" "$DOWNLOAD_URL" 2>/dev/null || {
            # Fallback: check for local build (dev mode)
            if [ -f "./target/release/prometheus" ]; then
                cp "./target/release/prometheus" "$TEMP_PATH"
                print_dim "Using local build (dev mode)"
            else
                print_error "Download failed"
                print_dim "Check your internet connection or GitHub URL"
                exit 1
            fi
        }
    elif command -v wget &> /dev/null; then
        wget -q -O "$TEMP_PATH" "$DOWNLOAD_URL" 2>/dev/null || {
            if [ -f "./target/release/prometheus" ]; then
                cp "./target/release/prometheus" "$TEMP_PATH"
                print_dim "Using local build (dev mode)"
            else
                print_error "Download failed"
                exit 1
            fi
        }
    else
        print_error "curl or wget required"
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

    # Success
    echo ""
    echo -e "${GRAY}  ─────────────────────────────────────${NC}"
    echo ""
    echo -e "${WHITE}  Installation complete.${NC}"
    echo ""
    echo -e "${DIM}  Run:${NC} ${WHITE}prometheus${NC}"
    echo ""
}

main "$@"
