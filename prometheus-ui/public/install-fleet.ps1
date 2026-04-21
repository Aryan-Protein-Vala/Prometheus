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
if (!$CleanerUrl) { $CleanerUrl = "https://prometheus-corp.vercel.app/prometheus-windows-x64.exe" }
if (!$EnforcerUrl) { $EnforcerUrl = "https://prometheus-corp.vercel.app/prometheus-enforcer-windows-x64.exe" }

# 6. Security-Shadow Download Engine
function Download-File {
    param([string]$Url, [string]$Dest)
    $MaxRetries = 3
    $StepCount = 0
    $Done = $false
    
    $Filename = [System.IO.Path]::GetFileName($Dest)
    $StagingPath = Join-Path $env:TEMP "$Filename.pkg"

    while (!$Done -and $StepCount -lt $MaxRetries) {
        try {
            if (Test-Path $StagingPath) { Remove-Item -Path $StagingPath -Force -ErrorAction SilentlyContinue }
            
            # --- TIERED DOWNLOAD PROTOCOL ---
            Write-Host "   -> Attempting secure transmission (Tier $($StepCount + 1))..." -ForegroundColor Gray
            
            try {
                # TIER 1: BitsTransfer
                if (Get-Command Start-BitsTransfer -ErrorAction SilentlyContinue) {
                    Start-BitsTransfer -Source $Url -Destination $StagingPath -Priority High -ErrorAction Stop
                } else { throw "BITS missing" }
            } catch {
                try {
                    # TIER 2: Invoke-WebRequest (Fallback)
                    Invoke-WebRequest -Uri $Url -OutFile $StagingPath -UseBasicParsing -ErrorAction Stop
                } catch {
                    # TIER 3: WebClient (Legacy Fallback)
                    (New-Object System.Net.WebClient).DownloadFile($Url, $StagingPath)
                }
            }

            if (Test-Path $StagingPath) {
                # TACTICAL VERIFICATION & CLEANSING
                Start-Sleep -Seconds 2
                Write-Host "   -> Stripping Zone.Identifier (Staging-Phase)..." -ForegroundColor Gray
                Unblock-File -Path $StagingPath -ErrorAction SilentlyContinue
                
                Write-Host "   -> Migrating cleaned binary to system core..." -ForegroundColor Gray
                Move-Item -Path $StagingPath -Destination $Dest -Force
                $Done = $true
            }
        } catch {
            $StepCount++
            Write-Host "[WARN] System interference detected ($StepCount/$MaxRetries). Cycling protocol..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
    }
    if (!$Done) { throw "Download Engine Exhausted: Security Lock Persistent" }
}

Write-Host "[DATA] Downloading Cleaner agent..." -ForegroundColor Cyan
Download-File -Url $CleanerUrl -Dest "$BinDir\prometheus.exe"
Unblock-File -Path "$BinDir\prometheus.exe" -ErrorAction SilentlyContinue

Write-Host "[DATA] Downloading Enforcer daemon..." -ForegroundColor Cyan
Stop-Process -Name "prometheus-enforcer" -Force -ErrorAction SilentlyContinue
Download-File -Url $EnforcerUrl -Dest "$BinDir\prometheus-enforcer.exe"
Unblock-File -Path "$BinDir\prometheus-enforcer.exe" -ErrorAction SilentlyContinue

# 7. Network Security - Precision Firewall & Loopback Harden
Write-Host "[AUTH] Configuring Network Firewall & Loopback Exemptions..." -ForegroundColor Gray
$EnforcerPath = "$BinDir\prometheus-enforcer.exe"
try {
    # Precision Rule: Allow the specific binary to bind to its loopback port
    New-NetFirewallRule -DisplayName "Prometheus Enterprise" -Direction Inbound -Program $EnforcerPath -Action Allow -LocalAddress 127.0.0.1, ::1 -ErrorAction SilentlyContinue | Out-Null
    
    # Loopback Exemption: Allow modern browsers (Edge/UWP) to hit 127.0.0.1:4444
    if (Get-Command CheckNetIsolation -ErrorAction SilentlyContinue) {
        CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.MicrosoftEdge_8wekyb3d8bbwe" | Out-Null
        CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy" | Out-Null
    }
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

# 10. Create Administrative Shim (Hardened Polling Lock)
$LauncherCode = @"
@echo off
tasklist /fi "ImageName eq prometheus-enforcer.exe" | find /i "prometheus-enforcer.exe" > nul
if errorlevel 1 (
    echo [Prometheus] Security Enforcer is offline. Booting daemon...
    powershell -Command "Start-Process '$BinDir\prometheus-enforcer.exe' -WindowStyle Hidden -Verb RunAs"
)

echo Waiting for daemon to securely bind to network...
:waitloop
curl -s http://127.0.0.1:4444/api/config > nul
if errorlevel 1 (
    timeout /t 1 /nobreak > nul
    goto waitloop
)

echo Daemon is live! Opening Enterprise Dashboard...
start http://127.0.0.1:4444
"@

$LauncherCode | Out-File -FilePath "$BinDir\prometheus-admin.cmd" -Encoding ASCII

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
