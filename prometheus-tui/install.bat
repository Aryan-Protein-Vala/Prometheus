@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM  PROMETHEUS INSTALLER - Windows
REM ═══════════════════════════════════════════════════════════════════════════

echo 🔥 Installing Prometheus...

REM Check if binary exists
if not exist "target\release\prometheus.exe" (
    echo ⚙️  Building Prometheus...
    cargo build --release
)

REM Create install directory if it doesn't exist
set INSTALL_DIR=%USERPROFILE%\.prometheus\bin

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

REM Copy binary
echo 📦 Copying to %INSTALL_DIR%...
copy /Y "target\release\prometheus.exe" "%INSTALL_DIR%\prometheus.exe"

REM Add to PATH (user level)
echo 📍 Adding to PATH...
setx PATH "%PATH%;%INSTALL_DIR%"

echo.
echo ✅ Prometheus installed successfully!
echo.
echo    IMPORTANT: Restart your terminal, then run: prometheus
echo.
echo 🔥 Happy cleaning!
pause
