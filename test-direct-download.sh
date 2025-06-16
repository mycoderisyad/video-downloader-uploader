#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3031"

echo -e "${BLUE}🧪 Testing Direct Download Functionality...${NC}\n"

# Test 1: Start a direct download
echo -e "${YELLOW}Test 1: Starting direct download...${NC}"
RESPONSE=$(curl -X POST $BASE_URL/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "quality": "360p", "downloadMode": "direct"}' \
  -s)

echo "Response: $RESPONSE"

# Extract job ID
JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    echo -e "${RED}❌ Failed to get job ID${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Job created with ID: $JOB_ID${NC}\n"

# Test 2: Monitor job status
echo -e "${YELLOW}Test 2: Monitoring job status...${NC}"
for i in {1..30}; do
    STATUS_RESPONSE=$(curl -s $BASE_URL/api/download-status/$JOB_ID)
    echo "Status check $i: $STATUS_RESPONSE"
    
    if echo "$STATUS_RESPONSE" | grep -q '"status":"completed"'; then
        echo -e "${GREEN}✅ Job completed!${NC}"
        break
    elif echo "$STATUS_RESPONSE" | grep -q '"status":"error"'; then
        echo -e "${RED}❌ Job failed!${NC}"
        exit 1
    fi
    
    sleep 2
done

# Test 3: Test manual download endpoint
echo -e "\n${YELLOW}Test 3: Testing manual download endpoint...${NC}"
DOWNLOAD_RESPONSE=$(curl -s -I $BASE_URL/api/download-file/$JOB_ID)
echo "Download endpoint response headers:"
echo "$DOWNLOAD_RESPONSE"

if echo "$DOWNLOAD_RESPONSE" | grep -q "200 OK"; then
    echo -e "${GREEN}✅ Download endpoint working${NC}"
else
    echo -e "${RED}❌ Download endpoint failed${NC}"
fi

# Test 4: Test double click prevention
echo -e "\n${YELLOW}Test 4: Testing double click prevention...${NC}"
echo "This test requires manual verification in browser console"
echo "1. Open browser to $BASE_URL"
echo "2. Check history tab for completed job: $JOB_ID"
echo "3. Click download button multiple times quickly"
echo "4. Verify only one download is triggered"
echo "5. Check browser console for prevention messages"

echo -e "\n${BLUE}📊 Direct Download Test Summary:${NC}"
echo -e "${GREEN}Job ID: $JOB_ID${NC}"
echo -e "${GREEN}Manual test URL: $BASE_URL${NC}"
echo -e "${YELLOW}Please verify in browser that double-click prevention works${NC}"

echo -e "\n${BLUE}🔍 Debug Information:${NC}"
echo "Check browser console for these messages:"
echo "- '🔽 Manual download button clicked for job: $JOB_ID'"
echo "- '⚠️ Download already in progress for job: $JOB_ID' (if double-clicked)"
echo "- '⚠️ Button already disabled, ignoring click' (if button clicked while disabled)" 