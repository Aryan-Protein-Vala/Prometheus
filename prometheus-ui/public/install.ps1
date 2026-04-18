# ═══════════════════════════════════════════════════════════════════════════
#  🔥 PROMETHEUS ENTERPRISE INSTALLER - Windows
# ═══════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Write-Host "🔥 Initializing Prometheus Enterprise Deployment..." -ForegroundColor Cyan

# 1. Force TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# 2. Define Directories
$InstallBase = "$env:ProgramData\Prometheus"
$BinDir = "$InstallBase\bin"
if (!(Test-Path $BinDir)) { New-Item -ItemType Directory -Force -Path $BinDir | Out-Null }
if (!(Test-Path $InstallBase)) { New-Item -ItemType Directory -Force -Path $InstallBase | Out-Null }

# 3. Discover Latest Release Assets via GitHub API
Write-Host "📡 Discovering latest binaries..." -ForegroundColor Cyan
$Repo = "Aryan-Protein-Vala/Prometheus"
$MaxRetries = 3
$RetryCount = 0
$Success = $false

while (!$Success -and $RetryCount -lt $MaxRetries) {
    try {
        $Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -TimeoutSec 15
        $CleanerAsset = $Release.assets | Where-Object { $_.name -like "*windows*" -and ($_.name -like "*tui*" -or $_.name -like "*prometheus-windows*") } | Select-Object -First 1
        $EnforcerAsset = $Release.assets | Where-Object { $_.name -like "*windows*" -and $_.name -like "*enforcer*" } | Select-Object -First 1
        $Success = $true
    } catch {
        $RetryCount++
        Write-Host "⚠️  Connection slow, retrying ($RetryCount/$MaxRetries)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (!$Success) {
    Write-Host "❌ FATAL: Could not connect to update servers. Check your internet connection." -ForegroundColor Red
    exit 1
}

if ($CleanerAsset) { $CleanerUrl = $CleanerAsset.browser_download_url }
    if ($EnforcerAsset) { $EnforcerUrl = $EnforcerAsset.browser_download_url }

# Fallback/Default URLs if discovery failed
if (!$CleanerUrl) { $CleanerUrl = "https://github.com/$Repo/releases/latest/download/prometheus-windows-x64.exe" }
if (!$EnforcerUrl) { $EnforcerUrl = "https://github.com/$Repo/releases/latest/download/prometheus-enforcer-windows-x64.exe" }

# 4. Download Binaries
Write-Host "⬇️  Downloading Cleaner agent..." -ForegroundColor Cyan

# SAFETY: Stop running cleaner if it exists
$CleanerProc = Get-Process "prometheus" -ErrorAction SilentlyContinue
if ($CleanerProc) {
    Write-Host "🛑 Stopping running cleaner for update..." -ForegroundColor Yellow
    Stop-Process -Name "prometheus" -Force
}

Invoke-WebRequest -Uri $CleanerUrl -OutFile "$BinDir\prometheus.exe" -UseBasicParsing

Write-Host "⬇️  Downloading Enforcer daemon..." -ForegroundColor Cyan

# SAFETY: Stop running enforcer so we can overwrite the file
$EnforcerProc = Get-Process "prometheus-enforcer" -ErrorAction SilentlyContinue
if ($EnforcerProc) {
    Write-Host "🛑 Stopping running enforcer for update..." -ForegroundColor Yellow
    Stop-Process -Name "prometheus-enforcer" -Force
    Start-Sleep -Seconds 2
}

Invoke-WebRequest -Uri $EnforcerUrl -OutFile "$BinDir\prometheus-enforcer.exe" -UseBasicParsing

# 5. Create 'prometheus-admin' Shim
Write-Host "🛠️  Creating administrative shims..." -ForegroundColor Cyan
# FORCE: Delete old shims to prevent Windows "Fuzzy Matching" conflicts
Remove-Item -Path "$BinDir\prometheus-admin.cmd" -ErrorAction SilentlyContinue
Remove-Item -Path "$BinDir\prometheus-admin.bat" -ErrorAction SilentlyContinue

"@echo off
start "" "http://localhost:4444"" | Out-File -FilePath "$BinDir\prometheus-admin.cmd" -Encoding ASCII

# 6. Global PATH Registration
Write-Host "📍 Registering Global Commands..." -ForegroundColor Cyan
$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($CurrentPath -notlike "*$BinDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$CurrentPath;$BinDir", "Machine")
    $env:Path += ";$BinDir"
}

# 7. Setup Background Enforcer Daemon (Scheduled Task)
Write-Host "⚙️  Configuring Prometheus Stealth Daemon..." -ForegroundColor Cyan
$TaskName = "PrometheusEnforcer"
$Binary = "$BinDir\prometheus-enforcer.exe"

# Open Firewall for Admin UI
try {
    Write-Host "🛡️  Configuring Security Firewall..." -ForegroundColor Gray
    New-NetFirewallRule -DisplayName "Prometheus Admin Dashboard" -Direction Inbound -LocalPort 4444 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
} catch {}

# Unregister old service if it exists
$ExistingService = Get-Service -Name "PrometheusEnforcer" -ErrorAction SilentlyContinue
if ($ExistingService) {
    Stop-Service -Name "PrometheusEnforcer" -ErrorAction SilentlyContinue
    sc.exe delete "PrometheusEnforcer" | Out-Null
}

# Unregister old task if it exists
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# Register new Task (Run as SYSTEM for global enforcement)
$Action = New-ScheduledTaskAction -Execute $Binary
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -User "SYSTEM" -RunLevel Highest | Out-Null

# Start the Task immediately
try {
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "🚀 Security Daemon Active & Safeguarded." -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not auto-start. Launching manual node..." -ForegroundColor Yellow
    Start-Process $Binary -WindowStyle Hidden
}
} catch {
    Write-Host "⚠️  Could not start service automatically. Ensure you are running as Admin." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ PROMETHEUS ENTERPRISE INSTALLED" -ForegroundColor Green
Write-Host "══════════════════════════════════"
Write-Host "Commands available in NEW terminals:"
Write-Host "  prometheus        - Start the cleaner interface"
Write-Host "  prometheus-admin  - Local admin dashboard"
Write-Host ""
Write-Host "Your device is now part of the Fleet. Manage at: https://prometheus-cleaner.vercel.app/admin"
Write-Host ""
