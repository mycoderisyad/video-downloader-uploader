# PowerShell script to install FFmpeg on Windows
Write-Host "Installing FFmpeg for Windows..." -ForegroundColor Blue

# Create ffmpeg directory
$ffmpegDir = "C:\ffmpeg"
$ffmpegBinDir = "$ffmpegDir\bin"

# Check if already installed
if (Test-Path "$ffmpegBinDir\ffmpeg.exe") {
    Write-Host "FFmpeg already installed at $ffmpegBinDir" -ForegroundColor Green
    
    # Check if in PATH
    $pathEnv = [Environment]::GetEnvironmentVariable("PATH", "Machine")
    if ($pathEnv -notlike "*$ffmpegBinDir*") {
        Write-Host "FFmpeg not in PATH, adding..." -ForegroundColor Yellow
        $newPath = "$pathEnv;$ffmpegBinDir"
        [Environment]::SetEnvironmentVariable("PATH", $newPath, "Machine")
        Write-Host "FFmpeg added to system PATH" -ForegroundColor Green
        Write-Host "Please restart your terminal/PowerShell" -ForegroundColor Yellow
    } else {
        Write-Host "FFmpeg already in PATH" -ForegroundColor Green
    }
    exit 0
}

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "This script requires administrator privileges" -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    # Create directory
    Write-Host "Creating FFmpeg directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $ffmpegDir | Out-Null
    
    # Download FFmpeg
    $downloadUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    $zipFile = "$ffmpegDir\ffmpeg-essentials.zip"
    
    Write-Host "Downloading FFmpeg..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile -UseBasicParsing
    
    # Extract FFmpeg
    Write-Host "Extracting FFmpeg..." -ForegroundColor Yellow
    Expand-Archive -Path $zipFile -DestinationPath $ffmpegDir -Force
    
    # Find extracted folder and move contents
    $extractedFolder = Get-ChildItem -Path $ffmpegDir -Directory | Where-Object { $_.Name -like "ffmpeg-*" } | Select-Object -First 1
    if ($extractedFolder) {
        Move-Item -Path "$($extractedFolder.FullName)\*" -Destination $ffmpegDir -Force
        Remove-Item -Path $extractedFolder.FullName -Recurse -Force
    }
    
    # Cleanup zip file
    Remove-Item -Path $zipFile -Force
    
    # Add to PATH
    Write-Host "Adding FFmpeg to system PATH..." -ForegroundColor Yellow
    $pathEnv = [Environment]::GetEnvironmentVariable("PATH", "Machine")
    $newPath = "$pathEnv;$ffmpegBinDir"
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "Machine")
    
    # Verify installation
    if (Test-Path "$ffmpegBinDir\ffmpeg.exe") {
        Write-Host "FFmpeg installed successfully!" -ForegroundColor Green
        Write-Host "Location: $ffmpegBinDir" -ForegroundColor Green
        Write-Host "Please restart your terminal/PowerShell to use FFmpeg" -ForegroundColor Yellow
        
        # Test FFmpeg version
        $ffmpegVersion = & "$ffmpegBinDir\ffmpeg.exe" -version 2>$null
        if ($ffmpegVersion) {
            $versionLine = ($ffmpegVersion -split "`n")[0]
            Write-Host "Version: $versionLine" -ForegroundColor Green
        }
    } else {
        Write-Host "Installation failed - ffmpeg.exe not found" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "Error during installation: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "FFmpeg installation completed!" -ForegroundColor Green
Read-Host "Press Enter to continue" 