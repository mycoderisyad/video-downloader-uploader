# Install FFmpeg using Scoop (no admin required)
Write-Host "Installing FFmpeg using Scoop (no admin required)..." -ForegroundColor Blue

# Check if FFmpeg is already available
if (Get-Command ffmpeg -ErrorAction SilentlyContinue) {
    $version = & ffmpeg -version 2>$null | Select-Object -First 1
    Write-Host "FFmpeg already installed: $version" -ForegroundColor Green
    exit 0
}

# Check if Scoop is installed
if (-not (Get-Command scoop -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Scoop package manager..." -ForegroundColor Yellow
    
    # Set execution policy for current user
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    
    # Install Scoop
    try {
        Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
        Write-Host "Scoop installed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "Failed to install Scoop: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Please install Scoop manually: https://scoop.sh" -ForegroundColor Yellow
        exit 1
    }
    
    # Refresh PATH for current session
    $machinePath = [System.Environment]::GetEnvironmentVariable("PATH","Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("PATH","User")
    $env:PATH = $machinePath + ";" + $userPath
}

# Install FFmpeg using Scoop
Write-Host "Installing FFmpeg..." -ForegroundColor Yellow
try {
    & scoop install ffmpeg
    Write-Host "FFmpeg installed successfully!" -ForegroundColor Green
    
    # Verify installation
    if (Get-Command ffmpeg -ErrorAction SilentlyContinue) {
        $version = & ffmpeg -version 2>$null | Select-Object -First 1
        Write-Host "Version: $version" -ForegroundColor Green
        
        # Check ffprobe
        if (Get-Command ffprobe -ErrorAction SilentlyContinue) {
            Write-Host "FFprobe also available" -ForegroundColor Green
        }
        
        Write-Host "FFmpeg installation completed!" -ForegroundColor Green
        Write-Host "You can now use the Video Downloader & Uploader" -ForegroundColor Blue
        
    } else {
        Write-Host "FFmpeg installed but not found in PATH" -ForegroundColor Yellow
        Write-Host "Please restart your terminal/PowerShell" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Failed to install FFmpeg: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Alternative options:" -ForegroundColor Yellow
    Write-Host "1. Download manually from: https://ffmpeg.org/download.html" -ForegroundColor Yellow
    Write-Host "2. Use Chocolatey (requires admin): choco install ffmpeg" -ForegroundColor Yellow
    Write-Host "3. Use winget: winget install Gyan.FFmpeg" -ForegroundColor Yellow
    exit 1
}

Write-Host "Setup completed! FFmpeg is ready to use." -ForegroundColor Green 