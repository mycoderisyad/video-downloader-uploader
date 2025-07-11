#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Installing FFmpeg for Linux...${NC}"

# Function to print colored output
print_success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

print_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

print_info() {
    echo -e "${BLUE}INFO: $1${NC}"
}

# Check if FFmpeg is already installed
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version 2>/dev/null | head -n 1)
    print_success "FFmpeg already installed: $FFMPEG_VERSION"
    
    # Also check ffprobe
    if command -v ffprobe &> /dev/null; then
        print_success "FFprobe also available"
    else
        print_warning "FFprobe not found, installing FFmpeg package"
    fi
    
    if command -v ffprobe &> /dev/null; then
        print_success "FFmpeg installation is complete!"
        exit 0
    fi
fi

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
else
    print_error "Cannot detect Linux distribution"
    exit 1
fi

print_info "Detected distribution: $DISTRO"

# Install FFmpeg based on distribution
case $DISTRO in
    ubuntu|debian)
        print_info "Installing FFmpeg on Ubuntu/Debian..."
        sudo apt update
        sudo apt install -y ffmpeg
        ;;
    centos|rhel|fedora)
        if command -v dnf &> /dev/null; then
            print_info "Installing FFmpeg on Fedora/RHEL 8+..."
            sudo dnf install -y ffmpeg ffmpeg-devel
        elif command -v yum &> /dev/null; then
            print_info "Installing FFmpeg on CentOS/RHEL 7..."
            # Enable EPEL repository first
            sudo yum install -y epel-release
            # Try RPM Fusion for FFmpeg
            sudo yum install -y https://download1.rpmfusion.org/free/el/rpmfusion-free-release-7.noarch.rpm
            sudo yum install -y ffmpeg ffmpeg-devel
        else
            print_error "No package manager found for Red Hat based system"
            exit 1
        fi
        ;;
    arch|manjaro)
        print_info "Installing FFmpeg on Arch Linux..."
        sudo pacman -S --noconfirm ffmpeg
        ;;
    opensuse|suse)
        print_info "Installing FFmpeg on openSUSE..."
        sudo zypper install -y ffmpeg
        ;;
    alpine)
        print_info "Installing FFmpeg on Alpine Linux..."
        sudo apk add --no-cache ffmpeg
        ;;
    *)
        print_warning "Unsupported distribution: $DISTRO"
        print_info "Trying generic installation..."
        
        # Try common package managers
        if command -v apt &> /dev/null; then
            sudo apt update && sudo apt install -y ffmpeg
        elif command -v yum &> /dev/null; then
            sudo yum install -y ffmpeg
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y ffmpeg
        elif command -v pacman &> /dev/null; then
            sudo pacman -S --noconfirm ffmpeg
        elif command -v zypper &> /dev/null; then
            sudo zypper install -y ffmpeg
        elif command -v apk &> /dev/null; then
            sudo apk add --no-cache ffmpeg
        else
            print_error "No supported package manager found"
            print_info "Please install FFmpeg manually:"
            print_info "Visit: https://ffmpeg.org/download.html"
            exit 1
        fi
        ;;
esac

# Verify installation
echo ""
print_info "Verifying FFmpeg installation..."

if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version 2>/dev/null | head -n 1)
    print_success "FFmpeg installed successfully!"
    print_success "Version: $FFMPEG_VERSION"
    
    # Check ffprobe
    if command -v ffprobe &> /dev/null; then
        FFPROBE_VERSION=$(ffprobe -version 2>/dev/null | head -n 1)
        print_success "FFprobe also available: $FFPROBE_VERSION"
    else
        print_warning "FFprobe not found, but FFmpeg is installed"
    fi
    
    # Show paths
    FFMPEG_PATH=$(which ffmpeg)
    FFPROBE_PATH=$(which ffprobe 2>/dev/null || echo "Not found")
    print_info "FFmpeg path: $FFMPEG_PATH"
    print_info "FFprobe path: $FFPROBE_PATH"
    
else
    print_error "FFmpeg installation failed"
    print_info "Please try installing manually:"
    
    case $DISTRO in
        ubuntu|debian)
            print_info "sudo apt install ffmpeg"
            ;;
        centos|rhel|fedora)
            print_info "sudo dnf install ffmpeg"
            print_info "or: sudo yum install ffmpeg"
            ;;
        arch|manjaro)
            print_info "sudo pacman -S ffmpeg"
            ;;
        *)
            print_info "Use your distribution's package manager"
            ;;
    esac
    
    exit 1
fi

print_success "FFmpeg installation completed!" 