# PowerShell script to check build issues for React Native/Expo Android builds
# Usage: .\scripts\check-build-issues.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Checking Build Configuration Issues" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check 2: CI/CD Environment
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "2. Checking CI/CD Environment" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (Test-Path "node_modules") {
    $moduleCount = (Get-ChildItem -Path "node_modules" -Directory | Measure-Object).Count
    Write-Host "✓ node_modules directory exists ($moduleCount packages)" -ForegroundColor Green
    
    # Check for key React Native modules
    $modules = @(
        "react-native",
        "expo",
        "@react-native-async-storage/async-storage",
        "@react-native-picker/picker",
        "react-native-gesture-handler",
        "react-native-linear-gradient",
        "react-native-reanimated",
        "react-native-safe-area-context",
        "react-native-screens",
        "react-native-vector-icons",
        "react-native-webview",
        "react-native-edge-to-edge",
        "react-native-svg"
    )
    
    Write-Host ""
    Write-Host "Checking key modules:" -ForegroundColor Yellow
    $missingModules = @()
    
    foreach ($module in $modules) {
        $modulePath = "node_modules\$module"
        if (Test-Path $modulePath) {
            Write-Host "  ✓ $module" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $module (MISSING)" -ForegroundColor Red
            $missingModules += $module
        }
    }
    
    if ($missingModules.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠ Warning: Missing modules detected. Run 'npm install' to install them." -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ node_modules directory does NOT exist" -ForegroundColor Red
    Write-Host "  Run 'npm install' to install dependencies" -ForegroundColor Yellow
}

# Check autolinking configuration
Write-Host ""
Write-Host "Checking autolinking configuration:" -ForegroundColor Yellow
$autolinkingPath = "android\build\generated\autolinking\autolinking.json"
if (Test-Path $autolinkingPath) {
    Write-Host "  ✓ autolinking.json exists" -ForegroundColor Green
    Write-Host "    Location: $autolinkingPath"
} else {
    Write-Host "  ⚠ autolinking.json not found (will be generated during build)" -ForegroundColor Yellow
}

# Check Android directory structure
Write-Host ""
Write-Host "Checking Android directory structure:" -ForegroundColor Yellow
if (Test-Path "android") {
    Write-Host "  ✓ android directory exists" -ForegroundColor Green
    
    $requiredFiles = @(
        "android\settings.gradle",
        "android\build.gradle",
        "android\app\build.gradle",
        "android\gradle.properties"
    )
    
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Host "    ✓ $(Split-Path $file -Leaf)" -ForegroundColor Green
        } else {
            Write-Host "    ✗ $(Split-Path $file -Leaf) (MISSING)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  ✗ android directory does NOT exist" -ForegroundColor Red
}

# Check environment variables
Write-Host ""
Write-Host "Checking environment variables:" -ForegroundColor Yellow
$envVar = $env:EXPO_USE_COMMUNITY_AUTOLINKING
if ($envVar) {
    Write-Host "  EXPO_USE_COMMUNITY_AUTOLINKING = $envVar" -ForegroundColor Green
} else {
    Write-Host "  EXPO_USE_COMMUNITY_AUTOLINKING is not set (using Expo autolinking)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "3. Checking Module Version Compatibility" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check versions from package.json
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    
    $rnVersion = $packageJson.dependencies.'react-native'
    $expoVersion = $packageJson.dependencies.expo
    
    Write-Host "Current versions:" -ForegroundColor Yellow
    Write-Host "  React Native: $rnVersion"
    Write-Host "  Expo SDK: $expoVersion"
    Write-Host ""
    
    Write-Host "Checking compatibility:" -ForegroundColor Yellow
    
    # Check React Native version
    if ($rnVersion -eq "0.79.2") {
        Write-Host "  ✓ React Native version is correct ($rnVersion)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ React Native version is $rnVersion (expected 0.79.2)" -ForegroundColor Yellow
    }
    
    # Check Expo version
    if ($expoVersion -like "~54.*" -or $expoVersion -like "^54.*") {
        Write-Host "  ✓ Expo SDK version is compatible ($expoVersion)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Expo SDK version is $expoVersion (expected ~54.x.x)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Checking React Native module compatibility:" -ForegroundColor Yellow
    
    $keyModules = @(
        "@react-native-async-storage/async-storage",
        "@react-native-picker/picker",
        "react-native-gesture-handler",
        "react-native-reanimated",
        "react-native-safe-area-context",
        "react-native-screens"
    )
    
    foreach ($module in $keyModules) {
        $version = $packageJson.dependencies.$module
        if ($version) {
            Write-Host "  ✓ $module : $version" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $module : NOT FOUND in package.json" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✗ package.json not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "4. Testing Autolinking Configuration" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Test autolinking command
Write-Host "Testing Expo autolinking:" -ForegroundColor Yellow
Write-Host "  Run: npx expo config --type introspect" -ForegroundColor Gray
Write-Host ""
Write-Host "To test with community autolinking, set environment variable:" -ForegroundColor Yellow
Write-Host "  `$env:EXPO_USE_COMMUNITY_AUTOLINKING='1'" -ForegroundColor Cyan
Write-Host ""
Write-Host "Then run your build command again." -ForegroundColor Yellow

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. If modules are missing: npm install"
Write-Host "2. If versions are incompatible: Update package.json"
Write-Host "3. To use community autolinking: Set EXPO_USE_COMMUNITY_AUTOLINKING=1"
Write-Host "4. Clean build: cd android; .\gradlew clean; cd .."
Write-Host ""

