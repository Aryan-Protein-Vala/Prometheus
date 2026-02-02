# ═══════════════════════════════════════════════════════════════════════════
#  🔥 PROMETHEUS INSTALLER - Windows (PowerShell)
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "🔥 Installing Prometheus..." -ForegroundColor Cyan

# Install Directory
$InstallDir = "$env:USERPROFILE\.prometheus\bin"
if (!(Test-Path -Path $InstallDir)) {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
}

# Placeholder for binary download (replace with actual URL)
$BinaryUrl = "https://github.com/Aryan-Protein-Vala/Prometheus/releases/latest/download/prometheus-windows-x64.exe"
$DestPath = "$InstallDir\prometheus.exe"

# Download Binary
Write-Host "⬇️  Downloading Prometheus..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $BinaryUrl -OutFile $DestPath


# Add to PATH
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    Write-Host "📍 Adding to PATH..." -ForegroundColor Cyan
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
}

Write-Host ""
Write-Host "✅ Prometheus installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "   Type 'prometheus' in a new terminal to start." -ForegroundColor Gray
Write-Host ""
