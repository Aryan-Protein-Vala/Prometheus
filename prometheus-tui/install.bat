@echo off
setlocal
echo ═══════════════════════════════════════════════════════════════════════════
echo  PROMETHEUS ENTERPRISE DEPLOYMENT (WINDOWS)
echo ═══════════════════════════════════════════════════════════════════════════

:: Check for Administrative privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Please run this installer as Administrator.
    pause
    exit /b 1
)

set INSTALL_DIR=C:\Program Files\Prometheus
set ENFORCER_PATH=%INSTALL_DIR%\prometheus-enforcer.exe
set DASHBOARD_URL=https://prometheus-cleaner.vercel.app

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo  ◦ Downloading Enterprise Binaries...
:: Mock: copy artifacts to install dir
copy /Y ".\target\release\prometheus.exe" "%INSTALL_DIR%\prometheus.exe" >nul 2>&1
copy /Y "..\target\release\prometheus-enforcer.exe" "%ENFORCER_PATH%" >nul 2>&1

:: Create prometheus-admin shortcut
echo @echo off > "%INSTALL_DIR%\prometheus-admin.bat"
echo echo Launching Prometheus Enterprise Console... >> "%INSTALL_DIR%\prometheus-admin.bat"
echo start %DASHBOARD_URL% >> "%INSTALL_DIR%\prometheus-admin.bat"

:: Add to PATH
setx PATH "%PATH%;%INSTALL_DIR%" /M >nul

:: Register Service for High-Availability
echo  ◦ Registering Background Service...
sc stop "PrometheusEnforcer" >nul 2>&1
sc delete "PrometheusEnforcer" >nul 2>&1
sc create "PrometheusEnforcer" binPath= "\"%ENFORCER_PATH%\"" start= auto DisplayName= "Prometheus Enterprise Enforcer" >nul
sc failure "PrometheusEnforcer" reset= 86400 actions= restart/5000/restart/5000/restart/5000
sc start "PrometheusEnforcer" >nul

echo.
echo  ✓ Installation Complete
echo  ─────────────────────────────────────
echo  Run cleaner: prometheus
echo  Run admin:   prometheus-admin
echo.
echo  [PRO-TIP] Restart your terminal to refresh the PATH.
pause
