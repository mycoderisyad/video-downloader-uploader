#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}Video Downloader & YouTube Uploader Setup${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Function to print colored output
print_header() {
    echo -e "${PURPLE}$1${NC}"
}

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

print_header "Step 1: Basic Configuration"
echo ""

# Get domain configuration
print_info "Configure your domain:"
echo "1. localhost (development)"
echo "2. Custom domain (production)"
echo ""
read -p "Choose option (1 or 2): " domain_choice

case $domain_choice in
    1)
        DOMAIN="localhost"
        PORT="3031"
        CORS_ORIGINS="http://localhost:3031,http://127.0.0.1:3031"
        PROTOCOL="http"
        print_success "Configured for local development"
        ;;
    2)
        echo ""
        read -p "Enter your domain (e.g., yourdomain.com): " DOMAIN
        read -p "Use HTTPS? (y/n): " use_https
        
        if [[ $use_https =~ ^[Yy]$ ]]; then
            PROTOCOL="https"
        else
            PROTOCOL="http"
        fi
        
        read -p "Enter port (default 3031): " PORT
        PORT=${PORT:-3031}
        
        CORS_ORIGINS="${PROTOCOL}://${DOMAIN},http://localhost:3031,http://127.0.0.1:3031"
        print_success "Configured for production domain: ${PROTOCOL}://${DOMAIN}:${PORT}"
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

echo ""
print_header "Step 2: YouTube API Configuration"
echo ""
print_info "You'll need YouTube API credentials from Google Cloud Console"
print_info "Visit: https://console.cloud.google.com"
echo ""

read -p "Do you have YouTube API credentials? (y/n): " has_credentials

if [[ $has_credentials =~ ^[Yy]$ ]]; then
    echo ""
    read -p "Enter YouTube Client ID: " YOUTUBE_CLIENT_ID
    read -s -p "Enter YouTube Client Secret: " YOUTUBE_CLIENT_SECRET
    echo ""
    
    # Auto-generate redirect URI
    YOUTUBE_REDIRECT_URI="${PROTOCOL}://${DOMAIN}:${PORT}/api/auth/youtube/callback"
    
    print_success "YouTube credentials configured"
    print_info "Redirect URI will be: ${YOUTUBE_REDIRECT_URI}"
else
    YOUTUBE_CLIENT_ID=""
    YOUTUBE_CLIENT_SECRET=""
    YOUTUBE_REDIRECT_URI=""
    
    print_warning "YouTube credentials not configured - you can add them later in Settings"
fi

echo ""
print_header "Step 3: Creating Configuration Files"
echo ""

# Create .env file
cat > .env << EOF
# Server Configuration
PORT=${PORT}
NODE_ENV=production
LOG_LEVEL=info

# Domain Configuration
DOMAIN=${DOMAIN}

# YouTube API Configuration
YOUTUBE_CLIENT_ID=${YOUTUBE_CLIENT_ID}
YOUTUBE_CLIENT_SECRET=${YOUTUBE_CLIENT_SECRET}
YOUTUBE_REDIRECT_URI=${YOUTUBE_REDIRECT_URI}

# CORS Origins
CORS_ORIGINS=${CORS_ORIGINS}

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# File Storage
MAX_FILE_SIZE=2GB
CLEANUP_INTERVAL=24h
EOF

print_success ".env file created"

# Create directories
print_info "Creating necessary directories..."
mkdir -p downloads uploads temp logs batch exports data config
chmod 755 downloads uploads temp logs batch exports data config
print_success "Directories created"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_info "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed"
fi

echo ""
print_header "Step 4: Setup Complete!"
echo ""

print_success "Application configured successfully!"
echo ""
print_info "Configuration Summary:"
echo "  • Domain: ${DOMAIN}"
echo "  • Port: ${PORT}"
echo "  • URL: ${PROTOCOL}://${DOMAIN}:${PORT}"
echo "  • YouTube API: $([ -n "$YOUTUBE_CLIENT_ID" ] && echo "Configured" || echo "Not configured")"
echo ""

print_info "Next Steps:"
echo "1. Start the application:"
echo "   ${GREEN}./start.sh${NC}"
echo ""
echo "2. Access your application:"
echo "   ${BLUE}${PROTOCOL}://${DOMAIN}:${PORT}${NC}"
echo ""

if [ -z "$YOUTUBE_CLIENT_ID" ]; then
    echo "3. Configure YouTube API:"
    echo "   • Visit Google Cloud Console: https://console.cloud.google.com"
    echo "   • Create OAuth 2.0 credentials"
    echo "   • Add redirect URI: ${YOUTUBE_REDIRECT_URI}"
    echo "   • Enter credentials in Settings tab"
    echo ""
fi

print_info "For more information, check README.md"

echo ""
print_success "Setup completed successfully!" 