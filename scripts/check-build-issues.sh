#!/bin/bash

# Script to check build issues for React Native/Expo Android builds
# Usage: ./scripts/check-build-issues.sh

echo "=========================================="
echo "Checking Build Configuration Issues"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 2: CI/CD Environment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Checking CI/CD Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if node_modules exists and has content
if [ -d "node_modules" ]; then
    MODULE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
    echo -e "${GREEN}✓${NC} node_modules directory exists ($MODULE_COUNT packages)"
    
    # Check for key React Native modules
    if [ -d "node_modules/react-native" ]; then
        echo -e "${GREEN}✓${NC} react-native is installed"
    else
        echo -e "${RED}✗${NC} react-native is NOT installed"
    fi
    
    if [ -d "node_modules/expo" ]; then
        echo -e "${GREEN}✓${NC} expo is installed"
    else
        echo -e "${RED}✗${NC} expo is NOT installed"
    fi
    
    # Check for autolinked modules
    echo ""
    echo "Checking autolinked React Native modules:"
    MODULES=(
        "@react-native-async-storage/async-storage"
        "@react-native-picker/picker"
        "react-native-gesture-handler"
        "react-native-linear-gradient"
        "react-native-reanimated"
        "react-native-safe-area-context"
        "react-native-screens"
        "react-native-vector-icons"
        "react-native-webview"
        "react-native-edge-to-edge"
        "react-native-svg"
    )
    
    MISSING_MODULES=()
    for MODULE in "${MODULES[@]}"; do
        if [ -d "node_modules/$MODULE" ]; then
            echo -e "  ${GREEN}✓${NC} $MODULE"
        else
            echo -e "  ${RED}✗${NC} $MODULE (MISSING)"
            MISSING_MODULES+=("$MODULE")
        fi
    done
    
    if [ ${#MISSING_MODULES[@]} -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}⚠ Warning: Missing modules detected. Run 'npm install' to install them.${NC}"
    fi
else
    echo -e "${RED}✗${NC} node_modules directory does NOT exist"
    echo -e "${YELLOW}  Run 'npm install' to install dependencies${NC}"
fi

# Check autolinking configuration
echo ""
echo "Checking autolinking configuration:"
if [ -f "android/build/generated/autolinking/autolinking.json" ]; then
    echo -e "${GREEN}✓${NC} autolinking.json exists"
    echo "  Location: android/build/generated/autolinking/autolinking.json"
    
    # Count autolinked modules
    if command -v jq &> /dev/null; then
        MODULE_COUNT=$(jq '.dependencies | length' android/build/generated/autolinking/autolinking.json 2>/dev/null)
        echo "  Autolinked modules: $MODULE_COUNT"
    fi
else
    echo -e "${YELLOW}⚠${NC} autolinking.json not found (will be generated during build)"
fi

# Check Android directory structure
echo ""
echo "Checking Android directory structure:"
if [ -d "android" ]; then
    echo -e "${GREEN}✓${NC} android directory exists"
    
    REQUIRED_FILES=(
        "android/settings.gradle"
        "android/build.gradle"
        "android/app/build.gradle"
        "android/gradle.properties"
    )
    
    for FILE in "${REQUIRED_FILES[@]}"; do
        if [ -f "$FILE" ]; then
            echo -e "  ${GREEN}✓${NC} $(basename $FILE)"
        else
            echo -e "  ${RED}✗${NC} $(basename $FILE) (MISSING)"
        fi
    done
else
    echo -e "${RED}✗${NC} android directory does NOT exist"
fi

# Check environment variables
echo ""
echo "Checking environment variables:"
if [ -n "$EXPO_USE_COMMUNITY_AUTOLINKING" ]; then
    echo -e "  ${GREEN}EXPO_USE_COMMUNITY_AUTOLINKING${NC} = $EXPO_USE_COMMUNITY_AUTOLINKING"
else
    echo -e "  ${YELLOW}EXPO_USE_COMMUNITY_AUTOLINKING${NC} is not set (using Expo autolinking)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Checking Module Version Compatibility"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check React Native version
if [ -f "package.json" ]; then
    RN_VERSION=$(grep -o '"react-native": "[^"]*"' package.json | cut -d'"' -f4)
    EXPO_VERSION=$(grep -o '"expo": "[^"]*"' package.json | cut -d'"' -f4)
    
    echo "Current versions:"
    echo "  React Native: $RN_VERSION"
    echo "  Expo SDK: $EXPO_VERSION"
    echo ""
    
    # Expected versions for Expo SDK 54
    EXPECTED_RN="0.79.2"
    EXPECTED_EXPO_MIN="54.0.0"
    
    echo "Checking compatibility:"
    
    # Check React Native version
    if [ "$RN_VERSION" = "$EXPECTED_RN" ]; then
        echo -e "  ${GREEN}✓${NC} React Native version is correct ($RN_VERSION)"
    else
        echo -e "  ${YELLOW}⚠${NC} React Native version is $RN_VERSION (expected $EXPECTED_RN)"
    fi
    
    # Check Expo version (basic check)
    EXPO_MAJOR=$(echo $EXPO_VERSION | cut -d'.' -f1 | cut -d'^' -f2)
    if [ "$EXPO_MAJOR" = "54" ]; then
        echo -e "  ${GREEN}✓${NC} Expo SDK version is compatible ($EXPO_VERSION)"
    else
        echo -e "  ${YELLOW}⚠${NC} Expo SDK version is $EXPO_VERSION (expected ~54.x.x)"
    fi
    
    echo ""
    echo "Checking React Native module compatibility:"
    
    # Check key modules
    MODULE_VERSIONS=(
        "@react-native-async-storage/async-storage:2.1.2"
        "@react-native-picker/picker:2.11.1"
        "react-native-gesture-handler:~2.24.0"
        "react-native-reanimated:~3.17.4"
        "react-native-safe-area-context:5.4.0"
        "react-native-screens:~4.10.0"
    )
    
    for MODULE_VERSION in "${MODULE_VERSIONS[@]}"; do
        MODULE=$(echo $MODULE_VERSION | cut -d':' -f1)
        EXPECTED=$(echo $MODULE_VERSION | cut -d':' -f2)
        INSTALLED=$(grep -o "\"$MODULE\": \"[^\"]*\"" package.json | cut -d'"' -f4)
        
        if [ -n "$INSTALLED" ]; then
            # Basic version check (just check if it's installed)
            echo -e "  ${GREEN}✓${NC} $MODULE: $INSTALLED"
        else
            echo -e "  ${RED}✗${NC} $MODULE: NOT FOUND in package.json"
        fi
    done
else
    echo -e "${RED}✗${NC} package.json not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Testing Autolinking Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test autolinking command
echo "Testing Expo autolinking:"
if command -v npx &> /dev/null; then
    echo "  Running: npx expo config --type introspect"
    npx expo config --type introspect > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} Expo config command works"
    else
        echo -e "  ${YELLOW}⚠${NC} Expo config command failed (may need npm install)"
    fi
else
    echo -e "  ${RED}✗${NC} npx not found"
fi

echo ""
echo "To test with community autolinking, set environment variable:"
echo "  export EXPO_USE_COMMUNITY_AUTOLINKING=1"
echo ""
echo "Then run your build command again."

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. If modules are missing: npm install"
echo "2. If versions are incompatible: Update package.json"
echo "3. To use community autolinking: Set EXPO_USE_COMMUNITY_AUTOLINKING=1"
echo "4. Clean build: cd android && ./gradlew clean && cd .."
echo ""

