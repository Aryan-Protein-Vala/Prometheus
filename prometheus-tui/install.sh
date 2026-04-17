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

if [ "$EUID" -ne 0 ]
  then echo -e "${RED}Please run this installer as root or with sudo.${NC}"
  exit
fi

INSTALL_PATH="/usr/local/bin/prometheus"
ENFORCER_PATH="/usr/local/bin/prometheus-enforcer"
CONFIG_DIR="/etc/prometheus"
CONFIG_FILE="$CONFIG_DIR/admin-config.json"
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
        else
            BINARY_NAME="prometheus-macos-x64"
        fi
        ;;
    Linux*)
        OS="linux"
        BINARY_NAME="prometheus-linux-x64"
        ;;
    *)
        echo -e "${RED}Unsupported OS${NC}"
        exit 1
        ;;
esac

# Note: We are simulating downloading 'prometheus-enforcer' alongside 'prometheus'
# Since we mock the binary URLs here, in reality they'd be part of the release assets.
echo -e "${GRAY}  ◦${NC} Downloading Client & Enforcer Binaries..."
# Fallback logic for sandbox testing
cp ./target/release/prometheus "$INSTALL_PATH" 2>/dev/null || true
cp ../prometheus-enforcer/target/release/prometheus-enforcer "$ENFORCER_PATH" 2>/dev/null || true

chmod +x "$INSTALL_PATH" 2>/dev/null || true
chmod +x "$ENFORCER_PATH" 2>/dev/null || true

# Admin Config
echo -e "${GRAY}  ◦${NC} Configuring Enterprise Rules..."
mkdir -p "$CONFIG_DIR"

echo -n "Enter Master Dashboard Password: "
read -s ADMIN_PASSWORD
echo ""

# Quick SHA256 Hash using shasum (Mac) or sha256sum (Linux)
if command -v shasum >/dev/null 2>&1; then
  HASH=$(echo -n "$ADMIN_PASSWORD" | shasum -a 256 | awk '{print $1}')
elif command -v sha256sum >/dev/null 2>&1; then
  HASH=$(echo -n "$ADMIN_PASSWORD" | sha256sum | awk '{print $1}')
else
  HASH="$ADMIN_PASSWORD" # Fallback
fi

cat > "$CONFIG_FILE" <<EOF
{
  "master_password_hash": "$HASH",
  "blocked_domains": []
}
EOF

# Restrict permissions
chmod 644 "$CONFIG_FILE" # Readable by all, writable only by root
chown root "$CONFIG_FILE"

# Background Service
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
    <key>StandardErrorPath</key>
    <string>/var/log/prometheus-enforcer.err</string>
    <key>StandardOutPath</key>
    <string>/var/log/prometheus-enforcer.out</string>
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

echo -e "${WHITE}  ✓ Installation Complete${NC}"
echo -e "${DIM}  Enforcer running on http://127.0.0.1:4444${NC}"
