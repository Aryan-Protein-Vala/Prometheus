@echo off
setlocal
echo ═══════════════════════════════════════════════════════════════════════════
echo  PROMETHEUS ENTERPRISE DEPLOYMENT
echo ═══════════════════════════════════════════════════════════════════════════

:: Check for Administrative privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Please run this installer as Administrator.
    pause
    exit /b 1
)

set INSTALL_DIR=C:\Program Files\Prometheus
set CONFIG_DIR=C:\ProgramData\Prometheus
set CONFIG_FILE=%CONFIG_DIR%\admin-config.json
set ENFORCER_PATH=%INSTALL_DIR%\prometheus-enforcer.exe

:: Create directories
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

echo  ◦ Downloading Client & Enforcer Binaries...
:: MOCK: In production, curl from Github Release
copy /Y ".\target\release\prometheus.exe" "%INSTALL_DIR%\prometheus.exe" >nul 2>&1
copy /Y "..\prometheus-enforcer\target\release\prometheus-enforcer.exe" "%ENFORCER_PATH%" >nul 2>&1

:: Set Path
setx PATH "%PATH%;%INSTALL_DIR%" /M >nul

echo  ◦ Configuring Enterprise Rules...
set /p ADMIN_PASSWORD="Enter Master Dashboard Password: "

:: Quick pseudo-hash (For production, use a proper script or the enforcer to initialize this securely)
:: We'll pass plaintext in this stub but the enforcer expects SHA256. 
:: A real enterprise installer would invoke powershell to compute the sha256 hash
for /f "delims=" %%a in ('powershell -Command "(Compute-Hash -Algorithm SHA256 -InputStream ([io.memorystream][text.encoding]::UTF8.GetBytes('%ADMIN_PASSWORD%'))).Hash -replace '-','' | ForEach-Object { $_.ToLower() }"') do set HASH=%%a

if "%HASH%"=="" set HASH=%ADMIN_PASSWORD%

echo { > "%CONFIG_FILE%"
echo   "master_password_hash": "%HASH%", >> "%CONFIG_FILE%"
echo   "blocked_domains": [] >> "%CONFIG_FILE%"
echo } >> "%CONFIG_FILE%"

:: Lock down permissions (SYSTEM and Administrators Full, Users Read)
icacls "%CONFIG_FILE%" /inheritance:r /grant:r "SYSTEM:(F)" /grant:r "Administrators:(F)" /grant:r "Users:(R)" >nul

echo  ◦ Registering Windows Service (Prometheus Enforcer)...
:: We use sc.exe to create the service
sc stop "PrometheusEnforcer" >nul 2>&1
sc delete "PrometheusEnforcer" >nul 2>&1
sc create "PrometheusEnforcer" binPath= "%ENFORCER_PATH%" start= auto DisplayName= "Prometheus Enterprise Enforcer" >nul
sc start "PrometheusEnforcer" >nul

echo  ✓ Installation Complete
echo  Enforcer running on http://127.0.0.1:4444
pause
