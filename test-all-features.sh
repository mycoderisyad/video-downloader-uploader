#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:3031"

echo -e "${BLUE}🧪 Starting comprehensive feature testing...${NC}\n"

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0

# Function to run test
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_pattern="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${YELLOW}Testing: $test_name${NC}"
    
    result=$(eval "$command" 2>/dev/null)
    
    if echo "$result" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo -e "${RED}Expected pattern: $expected_pattern${NC}"
        echo -e "${RED}Got: $result${NC}"
    fi
    echo ""
}

# Test 1: Server Health Check
run_test "Server Health Check" \
    "curl -s $BASE_URL/ | head -1" \
    "<!DOCTYPE html>"

# Test 2: API Documentation Page
run_test "API Documentation Page" \
    "curl -s $BASE_URL/api-docs | head -1" \
    "<!DOCTYPE html>"

# Test 3: Download API - Valid URL
run_test "Download API - Valid URL" \
    "curl -X POST $BASE_URL/api/download -H 'Content-Type: application/json' -d '{\"url\": \"https://www.youtube.com/watch?v=dQw4w9WgXcQ\", \"quality\": \"360p\", \"downloadMode\": \"server\"}' -s" \
    "success.*true"

# Test 4: Download API - Invalid URL
run_test "Download API - Invalid URL" \
    "curl -X POST $BASE_URL/api/download -H 'Content-Type: application/json' -d '{\"url\": \"invalid-url\", \"quality\": \"360p\"}' -s" \
    "success.*false"

# Test 5: Upload via Link API - No Auth
run_test "Upload via Link API - No Auth" \
    "curl -X POST $BASE_URL/api/upload-via-link -H 'Content-Type: application/json' -d '{\"url\": \"https://www.youtube.com/watch?v=dQw4w9WgXcQ\", \"title\": \"Test\", \"quality\": \"360p\"}' -s" \
    "authentication required"

# Test 6: Auth Status API
run_test "Auth Status API" \
    "curl -X POST $BASE_URL/api/auth/status -H 'Content-Type: application/json' -d '{}' -s" \
    "success.*true"

# Test 7: Upload YouTube API - No Auth
run_test "Upload YouTube API - No Auth" \
    "curl -X POST $BASE_URL/api/upload-youtube -H 'Content-Type: application/json' -d '{\"downloadJobId\": \"test-id\", \"title\": \"Test\"}' -s" \
    "authentication required"

# Test 8: Download Status API - Invalid Job ID
run_test "Download Status API - Invalid Job ID" \
    "curl -s $BASE_URL/api/download-status/invalid-job-id" \
    "success.*false"

# Test 9: Upload Status API - Invalid Job ID
run_test "Upload Status API - Invalid Job ID" \
    "curl -s $BASE_URL/api/upload-status/invalid-job-id" \
    "success.*false"

# Test 10: Auth Disconnect API
run_test "Auth Disconnect API" \
    "curl -X POST $BASE_URL/api/auth/disconnect -s" \
    "success.*true"

# Test 11: 404 Error Handling
run_test "404 Error Handling" \
    "curl -s $BASE_URL/api/nonexistent-endpoint" \
    "Endpoint tidak ditemukan"

# Test 12: Static Files - CSS/JS
run_test "Static Files - app.js" \
    "curl -s $BASE_URL/app.js | head -1" \
    "// Global variables"

# Test 13: CORS Headers
run_test "CORS Headers" \
    "curl -s -I $BASE_URL/api/auth/status | grep -i 'access-control'" \
    "Access-Control"

# Test 14: Content Security Policy
run_test "Content Security Policy" \
    "curl -s -I $BASE_URL/ | grep -i 'content-security-policy'" \
    "Content-Security-Policy"

# Test 15: JSON Response Format
run_test "JSON Response Format" \
    "curl -X POST $BASE_URL/api/auth/status -H 'Content-Type: application/json' -d '{}' -s | grep -o '\"success\":[^,}]*'" \
    "success.*true"

echo -e "${BLUE}📊 Test Results Summary:${NC}"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $((TOTAL_TESTS - PASSED_TESTS))${NC}"
echo -e "${BLUE}Total: $TOTAL_TESTS${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "\n${GREEN}🎉 All tests passed! System is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Please check the issues above.${NC}"
    exit 1
fi 