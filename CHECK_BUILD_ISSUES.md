# How to Check Build Issues

This guide explains how to check items 2, 3, and 4 from the troubleshooting steps.

## Quick Start

### For Linux/Mac:
```bash
chmod +x scripts/check-build-issues.sh
./scripts/check-build-issues.sh
```

### For Windows (PowerShell):
```powershell
.\scripts\check-build-issues.ps1
```

---

## 2. Check CI/CD Environment

### A. Verify Node Modules Installation

**Check if node_modules exists:**
```bash
# Linux/Mac
ls -la node_modules | head -20

# Windows
dir node_modules
```

**Verify key modules are installed:**
```bash
# Check React Native
ls node_modules/react-native

# Check Expo
ls node_modules/expo

# Check autolinked modules
ls node_modules/@react-native-async-storage
ls node_modules/react-native-gesture-handler
ls node_modules/react-native-reanimated
# ... etc
```

**If modules are missing, reinstall:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### B. Check Autolinking Configuration

**Verify autolinking.json exists (generated during build):**
```bash
# This file is generated during the build process
ls -la android/build/generated/autolinking/autolinking.json
```

**If it doesn't exist, it will be created during the build. To manually generate it:**
```bash
cd android
./gradlew :app:generateAutolinkingJson
cd ..
```

### C. Verify Android Directory Structure

**Check required files exist:**
```bash
# Linux/Mac
test -f android/settings.gradle && echo "✓ settings.gradle exists" || echo "✗ Missing"
test -f android/build.gradle && echo "✓ build.gradle exists" || echo "✗ Missing"
test -f android/app/build.gradle && echo "✓ app/build.gradle exists" || echo "✗ Missing"
test -f android/gradle.properties && echo "✓ gradle.properties exists" || echo "✗ Missing"

# Windows
if (Test-Path "android\settings.gradle") { Write-Host "✓" } else { Write-Host "✗" }
if (Test-Path "android\build.gradle") { Write-Host "✓" } else { Write-Host "✗" }
if (Test-Path "android\app\build.gradle") { Write-Host "✓" } else { Write-Host "✗" }
if (Test-Path "android\gradle.properties") { Write-Host "✓" } else { Write-Host "✗" }
```

### D. Check Environment Variables

**In your CI/CD environment (EAS Build), check:**
```bash
# Check if EXPO_USE_COMMUNITY_AUTOLINKING is set
echo $EXPO_USE_COMMUNITY_AUTOLINKING

# Windows
echo %EXPO_USE_COMMUNITY_AUTOLINKING%
```

**To set it in EAS Build, add to `eas.json`:**
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_USE_COMMUNITY_AUTOLINKING": "1"
      }
    }
  }
}
```

---

## 3. Verify Module Version Compatibility

### A. Check Current Versions

**View package.json:**
```bash
# Linux/Mac
cat package.json | grep -A 2 '"react-native"'
cat package.json | grep -A 2 '"expo"'

# Windows
Select-String -Path package.json -Pattern '"react-native"'
Select-String -Path package.json -Pattern '"expo"'
```

**Expected versions for Expo SDK 54:**
- React Native: `0.79.2`
- Expo: `~54.0.9` or `^54.0.9`

### B. Check Module Compatibility

**Verify all React Native modules are compatible with RN 0.79.2:**

```bash
# Check specific modules
npm list react-native-gesture-handler
npm list react-native-reanimated
npm list react-native-safe-area-context
npm list react-native-screens
```

**Check for version conflicts:**
```bash
npm ls
```

**If you see version conflicts, check compatibility:**
- React Native 0.79.2 compatibility: https://reactnative.dev/docs/upgrading
- Expo SDK 54 compatibility: https://docs.expo.dev/versions/latest/

### C. Update Incompatible Modules

**If a module is incompatible, update it:**
```bash
# Example: Update a specific module
npm install react-native-gesture-handler@latest

# Or update all to latest compatible versions
npm update
```

**Check what versions are compatible:**
```bash
# Check latest versions
npm view react-native-gesture-handler versions --json
npm view react-native-reanimated versions --json
```

---

## 4. Try Using Community Autolinking

### A. Set Environment Variable Locally

**Linux/Mac:**
```bash
export EXPO_USE_COMMUNITY_AUTOLINKING=1
# Then run your build
cd android && ./gradlew :app:assembleRelease
```

**Windows (PowerShell):**
```powershell
$env:EXPO_USE_COMMUNITY_AUTOLINKING="1"
cd android
.\gradlew :app:assembleRelease
```

**Windows (CMD):**
```cmd
set EXPO_USE_COMMUNITY_AUTOLINKING=1
cd android
gradlew :app:assembleRelease
```

### B. Set in EAS Build Configuration

**Update `eas.json`:**
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_USE_COMMUNITY_AUTOLINKING": "1"
      }
    },
    "preview": {
      "env": {
        "EXPO_USE_COMMUNITY_AUTOLINKING": "1"
      }
    },
    "development": {
      "env": {
        "EXPO_USE_COMMUNITY_AUTOLINKING": "1"
      }
    }
  }
}
```

### C. Verify Autolinking is Working

**After setting the environment variable, check the build logs:**
```bash
# Look for autolinking output in build logs
# You should see messages about autolinking libraries
```

**Check which autolinking is being used:**
- If `EXPO_USE_COMMUNITY_AUTOLINKING=1`: Uses React Native's autolinking
- If not set: Uses Expo's autolinking (default)

---

## Additional Debugging Steps

### Clean Build

**Clean everything and rebuild:**
```bash
# Clean Android build
cd android
./gradlew clean
cd ..

# Clean node modules (optional, if issues persist)
rm -rf node_modules
npm install

# Clean Expo cache
npx expo start --clear
```

### Check Build Logs

**In EAS Build, check the full build logs:**
```bash
# View recent builds
npx eas build:list --platform android --limit 5

# View specific build logs
npx eas build:view [build-id]
```

**Look for these in the logs:**
- Autolinking messages
- Module resolution errors
- Gradle configuration errors

### Verify Gradle Configuration

**Check if autolinking is properly configured in settings.gradle:**
```bash
# View settings.gradle
cat android/settings.gradle

# Should contain:
# - expo-autolinking-settings plugin
# - autolinkLibrariesFromCommand configuration
```

---

## Common Issues and Solutions

### Issue: "No variants exist" error
**Solution:** 
1. Clean build: `cd android && ./gradlew clean`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Try community autolinking: Set `EXPO_USE_COMMUNITY_AUTOLINKING=1`

### Issue: Modules not found
**Solution:**
1. Verify modules are in `package.json`
2. Run `npm install`
3. Check `node_modules` directory exists

### Issue: Version conflicts
**Solution:**
1. Check compatibility with React Native 0.79.2
2. Update incompatible modules
3. Use `npm ls` to find conflicts

### Issue: Autolinking not working in CI/CD
**Solution:**
1. Set `EXPO_USE_COMMUNITY_AUTOLINKING=1` in `eas.json`
2. Verify node_modules are installed in CI/CD
3. Check build logs for autolinking errors

---

## Need More Help?

- Expo Documentation: https://docs.expo.dev/
- React Native Documentation: https://reactnative.dev/docs/getting-started
- EAS Build Documentation: https://docs.expo.dev/build/introduction/
- Expo Forums: https://forums.expo.dev/

