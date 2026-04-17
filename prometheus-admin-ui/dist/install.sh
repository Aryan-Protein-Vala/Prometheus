#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  PROMETHEUS ENTERPRISE INSTALLER
# ═══════════════════════════════════════════════════════════════════════════

set -e

WHITE='\033[1;37m'
GRAY='\033[0;90m'
DIM='\033[2m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run this installer as root or with sudo.${NC}"
  exit
fi

INSTALL_PATH="/usr/local/bin/prometheus"
ENFORCER_PATH="/usr/local/bin/prometheus-enforcer"
ADMIN_CMD_PATH="/usr/local/bin/prometheus-admin"
CONFIG_DIR="/etc/prometheus"

GITHUB_REPO="Aryan-Protein-Vala/Prometheus"
GITHUB_URL="https://github.com/${GITHUB_REPO}/releases/latest/download"

echo -e "${WHITE}  PROMETHEUS ENTERPRISE DEPLOYMENT${NC}"
echo -e "${GRAY}  ─────────────────────────────────────${NC}"

# Detect OS
OS="unknown"
case "$(uname -s)" in
    Darwin*)
        OS="macos"
        ARCH=$(uname -m)
        if [ "$ARCH" = "arm64" ]; then
            BINARY_NAME="prometheus-macos-arm64"
            ENFORCER_NAME="prometheus-enforcer-macos-arm64"
        else
            BINARY_NAME="prometheus-macos-x64"
            ENFORCER_NAME="prometheus-enforcer-macos-x64"
        fi
        ;;
    Linux*)
        OS="linux"
        BINARY_NAME="prometheus-linux-x64"
        ENFORCER_NAME="prometheus-enforcer-linux-x64"
        ;;
    *)
        echo -e "${RED}Unsupported OS${NC}"
        exit 1
        ;;
esac

echo -e "${GRAY}  ◦${NC} Installing Enterprise Binaries..."

# FIRST: Try to use local build assets for development/testing
LOCAL_PROM="../target/release/prometheus"
LOCAL_ENF="../target/release/prometheus-enforcer"

if [ -f "$LOCAL_PROM" ] && [ -f "$LOCAL_ENF" ]; then
    echo -e "${DIM}    (Using local build artifacts)${NC}"
    cp "$LOCAL_PROM" "$INSTALL_PATH"
    cp "$LOCAL_ENF" "$ENFORCER_PATH"
else
    echo -e "${DIM}    (Downloading from GitHub Release)${NC}"
    mkdir -p /tmp/prometheus-setup
    curl -sL "${GITHUB_URL}/${BINARY_NAME}" -o "/tmp/prometheus-setup/prometheus"
    curl -sL "${GITHUB_URL}/${ENFORCER_NAME}" -o "/tmp/prometheus-setup/prometheus-enforcer"
    mv /tmp/prometheus-setup/prometheus "$INSTALL_PATH"
    mv /tmp/prometheus-setup/prometheus-enforcer "$ENFORCER_PATH"
    rm -rf /tmp/prometheus-setup
fi

chmod +x "$INSTALL_PATH"
chmod +x "$ENFORCER_PATH"

# Admin Config Setup
# Note: Newer version uses /Users/Shared/prometheus-admin.json or /tmp/
mkdir -p "$CONFIG_DIR"
chmod 755 "$CONFIG_DIR"

# Create the prometheus-admin helper command
echo -e "${GRAY}  ◦${NC} Creating 'prometheus-admin' shortcut..."
cat > "$ADMIN_CMD_PATH" <<EOF
#!/bin/bash
echo "Opening Prometheus Enterprise Dashboard..."
if command -v open &> /dev/null; then
    open http://localhost:4444
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:4444
fi
EOF
chmod +x "$ADMIN_CMD_PATH"

# Background Service Registration
if [ "$OS" = "macos" ]; then
    echo -e "${GRAY}  ◦${NC} Registering LaunchDaemon..."
    PLIST="/Library/LaunchDaemons/com.prometheus.enforcer.plist"
    cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.prometheus.enforcer</string>
    <key>ProgramArguments</key>
    <array>
        <string>$ENFORCER_PATH</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF
    launchctl unload "$PLIST" 2>/dev/null || true
    launchctl load -w "$PLIST" 2>/dev/null || true
elif [ "$OS" = "linux" ]; then
    echo -e "${GRAY}  ◦${NC} Registering Systemd Service..."
    SERVICE="/etc/systemd/system/prometheus-enforcer.service"
    cat > "$SERVICE" <<EOF
[Unit]
Description=Prometheus Enterprise Enforcer
After=network.target

[Service]
ExecStart=$ENFORCER_PATH
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload 2>/dev/null || true
    systemctl enable prometheus-enforcer 2>/dev/null || true
    systemctl start prometheus-enforcer 2>/dev/null || true
fi

echo -e ""
echo -e "${WHITE}  ✓ Installation Complete${NC}"
echo -e "${GRAY}  ─────────────────────────────────────${NC}"
echo -e "${DIM}  Run cleaner:${NC}  ${WHITE}prometheus${NC}"
echo -e "${DIM}  Run admin:${NC}    ${WHITE}prometheus-admin${NC}"
echo ""
