# KAMPYN Mobile App - Build & Deployment Guide

*Project under **EXSOLVIA** - Excellence in Software Solutions*

## Build Configuration

### EAS Build Setup

#### EAS Configuration
```json
// eas.json
{
  "cli": {
    "version": ">= 5.4.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "autoIncrement": true
      },
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      },
      "android": {
        "serviceAccountKeyPath": "./path/to/service-account.json",
        "track": "production"
      }
    }
  }
}
```

#### App Configuration
```json
// app.json
{
  "expo": {
    "name": "KAMPYN",
    "slug": "kampyn-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.exsolvia.kampyn",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.exsolvia.kampyn",
      "versionCode": 1
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

## Build Process

### Development Builds

#### iOS Development Build
```bash
# Build for iOS development
npx eas build --platform ios --profile development

# Build for iOS simulator
npx eas build --platform ios --profile preview
```

#### Android Development Build
```bash
# Build for Android development
npx eas build --platform android --profile development

# Build APK for testing
npx eas build --platform android --profile preview
```

### Production Builds

#### iOS Production Build
```bash
# Build for App Store
npx eas build --platform ios --profile production

# Check build status
npx eas build:list --platform ios --limit 10
```

#### Android Production Build
```bash
# Build AAB for Google Play Store
npx eas build --platform android --profile production

# Check build status
npx eas build:list --platform android --limit 10
```

#### Universal Builds
```bash
# Build for both platforms
npx eas build --platform all --profile production

# Build specific platforms
npx eas build --platform ios,android --profile production
```

## Deployment Process

### App Store Deployment

#### iOS App Store
```bash
# Submit to App Store
npx eas submit --platform ios --profile production

# Submit with specific build
npx eas submit --platform ios --id [build-id]

# Check submission status
npx eas submit:list --platform ios
```

#### Android Google Play Store
```bash
# Submit to Google Play Store
npx eas submit --platform android --profile production

# Submit with specific build
npx eas submit --platform android --id [build-id]

# Check submission status
npx eas submit:list --platform android
```

### Over-the-Air Updates

#### Update Configuration
```json
// eas.json update configuration
{
  "update": {
    "development": {
      "channel": "development"
    },
    "preview": {
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  }
}
```

#### Publishing Updates
```bash
# Publish update to development channel
npx eas update --branch development --message "Development updates"

# Publish update to production channel
npx eas update --branch production --message "Bug fixes and improvements"

# Publish update with specific channel
npx eas update --channel production --message "New features added"

# Check update status
npx eas update:list --branch production
```

## Environment Configuration

### Environment Variables
```bash
# .env files for different environments
.env.development
.env.preview
.env.production
```

#### Development Environment
```env
# .env.development
BACKEND_URL=http://localhost:5001
API_BASE_URL=http://localhost:5001/api
ENVIRONMENT=development
DEBUG=true
```

#### Preview Environment
```env
# .env.preview
BACKEND_URL=https://api-preview.kampyn.com
API_BASE_URL=https://api-preview.kampyn.com/api
ENVIRONMENT=preview
DEBUG=false
```

#### Production Environment
```env
# .env.production
BACKEND_URL=https://api.kampyn.com
API_BASE_URL=https://api.kampyn.com/api
ENVIRONMENT=production
DEBUG=false
```

### Build-time Environment Variables
```json
// eas.json with environment variables
{
  "build": {
    "production": {
      "env": {
        "BACKEND_URL": "https://api.kampyn.com",
        "API_BASE_URL": "https://api.kampyn.com/api",
        "ENVIRONMENT": "production"
      }
    }
  }
}
```

## Code Signing

### iOS Code Signing

#### Apple Developer Account Setup
1. Create Apple Developer Account
2. Generate App Store Connect API Key
3. Configure Team ID and Bundle Identifier

#### Provisioning Profiles
```bash
# Configure iOS credentials
npx eas credentials

# Manage provisioning profiles
npx eas credentials --platform ios
```

#### Certificates
```bash
# Generate distribution certificate
npx eas credentials --platform ios --type distribution

# Generate development certificate
npx eas credentials --platform ios --type development
```

### Android Code Signing

#### Google Play Console Setup
1. Create Google Play Developer Account
2. Generate service account JSON key
3. Configure package name and signing

#### Keystore Management
```bash
# Configure Android credentials
npx eas credentials --platform android

# Generate keystore
npx eas credentials --platform android --type keystore
```

## Testing & QA

### Internal Testing

#### TestFlight (iOS)
```bash
# Submit to TestFlight
npx eas submit --platform ios --profile production

# Add testers via App Store Connect
# Configure TestFlight groups
```

#### Internal Testing (Android)
```bash
# Upload to Google Play Console
npx eas submit --platform android --profile production

# Create internal testing track
# Add testers via Google Play Console
```

### Beta Testing

#### Beta Distribution
```bash
# Build beta version
npx eas build --platform all --profile preview

# Distribute via Expo Go
npx eas update --channel beta --message "Beta testing version"
```

## Monitoring & Analytics

### Crash Reporting
```bash
# Install Sentry
npm install @sentry/react-native

# Configure Sentry
npx sentry-wizard -i reactNative -p ios android
```

### Performance Monitoring
```bash
# Install Flipper
npm install --save-dev react-native-flipper

# Configure performance monitoring
```

### Analytics
```bash
# Install Firebase Analytics
npm install @react-native-firebase/analytics

# Configure analytics tracking
```

## CI/CD Pipeline

### GitHub Actions

#### Build Workflow
```yaml
# .github/workflows/build.yml
name: Build and Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build for production
        if: github.ref == 'refs/heads/main'
        run: npx eas build --platform all --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

#### Update Workflow
```yaml
# .github/workflows/update.yml
name: Publish Update

on:
  push:
    branches: [main]

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Publish OTA update
        run: npx eas update --branch production --message "Automated update from CI"
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

## Troubleshooting

### Build Issues

#### Common Build Errors
```bash
# Clear EAS build cache
npx eas build --clear-cache

# Reset project configuration
npx eas build:configure

# Check build logs
npx eas build:list --platform ios --limit 1
npx eas build:view [build-id]
```

#### iOS Build Issues
```bash
# Reset iOS credentials
npx eas credentials --platform ios --clear-credentials

# Regenerate certificates
npx eas credentials --platform ios --type distribution
```

#### Android Build Issues
```bash
# Reset Android credentials
npx eas credentials --platform android --clear-credentials

# Regenerate keystore
npx eas credentials --platform android --type keystore
```

### Submission Issues

#### App Store Rejections
```bash
# Check submission status
npx eas submit:list --platform ios

# View submission details
npx eas submit:view [submission-id]
```

#### Google Play Issues
```bash
# Check Play Console for errors
# Verify bundle configuration
# Check signing certificate
```

### Update Issues

#### OTA Update Problems
```bash
# Check update status
npx eas update:list --branch production

# View update details
npx eas update:view [update-id]

# Rollback update
npx eas update:rollback --branch production
```

## Best Practices

### Build Optimization
- Use appropriate build profiles for different environments
- Optimize bundle size with tree shaking
- Implement code splitting for better performance
- Use environment-specific configurations

### Security
- Never commit sensitive credentials to version control
- Use EAS secrets for sensitive environment variables
- Implement proper code signing and certificate management
- Regular security audits and dependency updates

### Release Management
- Use semantic versioning for releases
- Maintain separate branches for different environments
- Implement proper testing before production releases
- Document all changes and updates

### Monitoring
- Implement crash reporting and error tracking
- Monitor app performance and user analytics
- Set up alerts for critical issues
- Regular health checks and maintenance

---

**© 2025 EXSOLVIA. All rights reserved.**
