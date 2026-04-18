# ═══════════════════════════════════════════════════════════════════════════
#  🔥 PROMETHEUS ENTERPRISE INSTALLER - Windows
# ═══════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
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
try {
    $Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
    $CleanerAsset = $Release.assets | Where-Object { $_.name -like "*windows*" -and ($_.name -like "*tui*" -or $_.name -like "*prometheus-windows*") } | Select-Object -First 1
    $EnforcerAsset = $Release.assets | Where-Object { $_.name -like "*windows*" -and $_.name -like "*enforcer*" } | Select-Object -First 1

    if ($CleanerAsset) { $CleanerUrl = $CleanerAsset.browser_download_url }
    if ($EnforcerAsset) { $EnforcerUrl = $EnforcerAsset.browser_download_url }
} catch {
    Write-Host "⚠️  API Discovery failed, using fallback links..." -ForegroundColor Yellow
}

# Fallback/Default URLs if discovery failed
if (!$CleanerUrl) { $CleanerUrl = "https://github.com/$Repo/releases/latest/download/prometheus-windows-x64.exe" }
if (!$EnforcerUrl) { $EnforcerUrl = "https://github.com/$Repo/releases/latest/download/prometheus-enforcer-windows-x64.exe" }

# 4. Download Binaries
Write-Host "⬇️  Downloading Cleaner agent..." -ForegroundColor Cyan
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
"@echo off
start http://localhost:4444" | Out-File -FilePath "$BinDir\prometheus-admin.cmd" -Encoding ASCII

# 6. Global PATH Registration
Write-Host "📍 Registering Global Commands..." -ForegroundColor Cyan
$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($CurrentPath -notlike "*$BinDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$CurrentPath;$BinDir", "Machine")
    $env:Path += ";$BinDir"
}

# 7. Setup Background Enforcer Service
Write-Host "⚙️  Configuring Prometheus Stealth Daemon..." -ForegroundColor Cyan
$ServiceName = "PrometheusEnforcer"

# Check if service exists
$ExistingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($ExistingService) {
    Write-Host "   Updating existing service..." -ForegroundColor Gray
    Stop-Service -Name $ServiceName -ErrorAction SilentlyContinue
} else {
    Write-Host "   Registering new system service..." -ForegroundColor Gray
    New-Service -Name $ServiceName `
                -BinaryPathName "`"$BinDir\prometheus-enforcer.exe`"" `
                -DisplayName "Prometheus Security Enforcer" `
                -Description "Enterprise-grade web and application security enforcer for Prometheus Suite." `
                -StartupType Automatic
}

# Start the service
try {
    Start-Service -Name $ServiceName
    Write-Host "🚀 Security Daemon Active." -ForegroundColor Green
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
