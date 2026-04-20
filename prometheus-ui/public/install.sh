#!/bin/bash
# ===========================================================================
#  PROMETHEUS ENTERPRISE FLEET INSTALLER - Unix (v1.3.26)
# ===========================================================================

set -e

# 1. Require Root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this installer with sudo."
  exit 1
fi

INSTALL_PATH="/usr/local/bin/prometheus"
ENFORCER_PATH="/usr/local/bin/prometheus-enforcer"
ADMIN_CMD_PATH="/usr/local/bin/prometheus-admin"
CONFIG_DIR="/etc/prometheus"

# 2. Define High-Availability Assets (Vercel Primary)
echo "[NET] Securing high-availability assets..."
DOMAIN="https://prometheus-cleaner.vercel.app"

case "$(uname -s)" in
    Darwin*)
        ARCH=$(uname -m)
        if [ "$ARCH" = "arm64" ]; then
            CLEANER_URL="$DOMAIN/prometheus-macos-arm64"
            ENFORCER_URL="$DOMAIN/prometheus-enforcer-macos-arm64"
        else
            CLEANER_URL="$DOMAIN/prometheus-macos-x64"
            ENFORCER_URL="$DOMAIN/prometheus-enforcer-macos-x64"
        fi
        ;;
    Linux*)
        CLEANER_URL="$DOMAIN/prometheus-linux-x64"
        ENFORCER_URL="$DOMAIN/prometheus-enforcer-linux-x64"
        ;;
esac

echo "[DATA] Downloading Prometheus Enterprise suite..."

# SAFETY: Stop running enforcer
if pgrep -f "prometheus-enforcer" > /dev/null; then
    pkill -f "prometheus-enforcer"
    sleep 2
fi

# Download binaries
mkdir -p /tmp/prometheus-setup
curl -sL "$CLEANER_URL" -o /tmp/prometheus-setup/prometheus
curl -sL "$ENFORCER_URL" -o /tmp/prometheus-setup/prometheus-enforcer

mv /tmp/prometheus-setup/prometheus "$INSTALL_PATH"
mv /tmp/prometheus-setup/prometheus-enforcer "$ENFORCER_PATH"
rm -rf /tmp/prometheus-setup

chmod +x "$INSTALL_PATH"
chmod +x "$ENFORCER_PATH"

# 3. Create 'prometheus-admin' Shortcut
echo "[SYS] Creating shims..."
cat > "$ADMIN_CMD_PATH" <<EOF
#!/bin/bash
if command -v open &> /dev/null; then
    open http://localhost:4444
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:4444
fi
EOF
chmod +x "$ADMIN_CMD_PATH"

# 4. Background Service Registration
if [[ "$(uname -s)" == "Darwin"* ]]; then
    echo "[SYS] Registering LaunchDaemon..."
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
    <key>StandardOutPath</key>
    <string>/var/log/prometheus-enforcer.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/prometheus-enforcer.err</string>
</dict>
</plist>
EOF
    launchctl bootout system "$PLIST" 2>/dev/null || true
    launchctl bootstrap system "$PLIST" 2>/dev/null || true
else
    echo "[SYS] Registering Systemd Service..."
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

echo ""
echo "[OK] INSTALLATION COMPLETE"
echo "=========================="
echo "Commands:"
echo "  prometheus        - Start cleaner"
echo "  prometheus-admin  - Start admin UI"
echo ""
