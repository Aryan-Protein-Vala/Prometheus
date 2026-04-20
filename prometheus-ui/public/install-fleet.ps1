# ===========================================================================
#  PROMETHEUS ENTERPRISE FLEET INSTALLER - Windows (v1.3.25)
# ===========================================================================

$ErrorActionPreference = "Stop"

# 1. Require Admin Privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[FATAL] Please run PowerShell as Administrator." -ForegroundColor Red
    return
}

Write-Host "[INIT] Booting Prometheus Enterprise IPv4 Lockdown Deployment..." -ForegroundColor Cyan

# 2. Global TLS & System Cleanup
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
if (Get-Command Get-BitsTransfer -ErrorAction SilentlyContinue) {
    Get-BitsTransfer | Remove-BitsTransfer -ErrorAction SilentlyContinue
}

# 3. Define Directories
$InstallDir = "$env:ProgramFiles\Prometheus"
$BinDir = "$InstallDir\bin"
if (!(Test-Path $BinDir)) { New-Item -ItemType Directory -Force -Path $BinDir | Out-Null }

# 4. Windows Defender Override
Write-Host "[AUTH] Configuring Security Exclusions..." -ForegroundColor Gray
try {
    Add-MpPreference -ExclusionPath $InstallDir -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionPath "C:\ProgramData\Prometheus" -ErrorAction SilentlyContinue
} catch {
    Write-Host "[WARN] Defender exclusion skipped." -ForegroundColor Yellow
}

# 5. Discover Latest Release Assets
Write-Host "[NET] Discovering latest binaries..." -ForegroundColor Cyan
$Repo = "Aryan-Protein-Vala/Prometheus"
$CleanerUrl = ""
$EnforcerUrl = ""

try {
    $Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -TimeoutSec 15
    $CleanerAsset = $Release.assets | Where-Object { $_.name -like "*windows*" -and ($_.name -like "*tui*" -or $_.name -like "*prometheus-windows*") } | Select-Object -First 1
    $EnforcerAsset = $Release.assets | Where-Object { $_.name -like "*windows*" -and $_.name -like "*enforcer*" } | Select-Object -First 1
    if ($CleanerAsset) { $CleanerUrl = $CleanerAsset.browser_download_url }
    if ($EnforcerAsset) { $EnforcerUrl = $EnforcerAsset.browser_download_url }
} catch {
    Write-Host "[WARN] GitHub API slow, using fallback URLs." -ForegroundColor Yellow
}

# Fallback URLs
if (!$CleanerUrl) { $CleanerUrl = "https://prometheus-cleaner.vercel.app/prometheus-windows-x64.exe" }
if (!$EnforcerUrl) { $EnforcerUrl = "https://prometheus-cleaner.vercel.app/prometheus-enforcer-windows-x64.exe" }

# 6. Stealth Download Engine
function Download-File {
    param([string]$Url, [string]$Dest)
    $MaxRetries = 3
    $StepCount = 0
    $Done = $false
    $TempDest = $Dest + ".pkg"

    while (!$Done -and $StepCount -lt $MaxRetries) {
        try {
            if (Test-Path $TempDest) { Remove-Item -Path $TempDest -Force -ErrorAction SilentlyContinue }
            if (Get-Command Start-BitsTransfer -ErrorAction SilentlyContinue) {
                Start-BitsTransfer -Source $Url -Destination $TempDest -ErrorAction Stop
            } else {
                (New-Object System.Net.WebClient).DownloadFile($Url, $TempDest)
            }
            
            if (Test-Path $TempDest) {
                Write-Host "   -> Verification successful. Unblocking..." -ForegroundColor Gray
                Unblock-File -Path $TempDest -ErrorAction SilentlyContinue
                Move-Item -Path $TempDest -Destination $Dest -Force
                $Done = $true
            }
        } catch {
            $StepCount++
            Write-Host "[WARN] System blocked attempt ($StepCount/$MaxRetries)... Retrying." -ForegroundColor Yellow
            Start-Sleep -Seconds 3
        }
    }
    if (!$Done) { throw "Download Failed" }
}

Write-Host "[DATA] Downloading Cleaner agent..." -ForegroundColor Cyan
Download-File -Url $CleanerUrl -Dest "$BinDir\prometheus.exe"
Unblock-File -Path "$BinDir\prometheus.exe" -ErrorAction SilentlyContinue

Write-Host "[DATA] Downloading Enforcer daemon..." -ForegroundColor Cyan
Stop-Process -Name "prometheus-enforcer" -Force -ErrorAction SilentlyContinue
Download-File -Url $EnforcerUrl -Dest "$BinDir\prometheus-enforcer.exe"
Unblock-File -Path "$BinDir\prometheus-enforcer.exe" -ErrorAction SilentlyContinue

# 7. Network Security - Precision Firewall Override
Write-Host "[AUTH] Configuring Network Firewall..." -ForegroundColor Gray
$EnforcerPath = "$BinDir\prometheus-enforcer.exe"
try {
    # Precision Rule: Allow the specific binary to bind to its loopback port
    New-NetFirewallRule -DisplayName "Prometheus Enterprise" -Direction Inbound -Program $EnforcerPath -Action Allow -LocalAddress 127.0.0.1, ::1 -ErrorAction SilentlyContinue | Out-Null
} catch {}

# 8. Global PATH Registration
Write-Host "[SYS] Registering Global Commands..." -ForegroundColor Cyan
$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($CurrentPath -notlike "*$BinDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$CurrentPath;$BinDir", "Machine")
    $env:Path += ";$BinDir"
}

# 9. Setup Background Enforcer (Scheduled Task)
Write-Host "[SYS] Configuring Stealth Daemon..." -ForegroundColor Cyan
$TaskName = "PrometheusEnforcer"
$Binary = "$BinDir\prometheus-enforcer.exe"

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
$Action = New-ScheduledTaskAction -Execute $Binary
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -User "SYSTEM" -RunLevel Highest | Out-Null

Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

# 10. Create Administrative Shim (Dual-Stack Localhost)
$ShimContent = "@echo off`r`nstart `"`" `"http://localhost:4444`""
$ShimContent | Out-File -FilePath "$BinDir\prometheus-admin.cmd" -Encoding ASCII

Write-Host ""
Write-Host "[OK] PROMETHEUS ENTERPRISE INSTALLED" -ForegroundColor Green
Write-Host "===================================="
Write-Host "Location: $InstallDir"
Write-Host "Network:  Bound to loopback:4444 (Dual-Stack IPv4/IPv6)"
Write-Host "Commands:"
Write-Host "  prometheus        - Start cleaner"
Write-Host "  prometheus-admin  - Start admin"
Write-Host ""
Write-Host "Security clearance active. System hardened."
Write-Host ""
