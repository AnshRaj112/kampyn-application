# KAMPYN - Mobile Application

*Project under **EXSOLVIA** - Excellence in Software Solutions*

## Introduction
The **KAMPYN Mobile Application** is a cutting-edge React Native solution that brings the complete KAMPYN food ordering ecosystem directly to students' mobile devices. Built with modern mobile development practices, it provides a seamless, intuitive, and feature-rich experience for iOS and Android users.

## Tech Stack

### Mobile Framework
- **Framework:** React Native with Expo
- **Language:** TypeScript
- **Navigation:** React Navigation 6
- **State Management:** Redux Toolkit
- **UI Components:** React Native Paper
- **Build System:** EAS Build

### Backend Integration
- **API Communication:** Axios with interceptors
- **Authentication:** JWT token management
- **Real-Time Updates:** Socket.io
- **Push Notifications:** Expo Notifications
- **Storage:** AsyncStorage for local data

## Features
- **User Authentication** - Multi-method login with Google OAuth
- **Food Ordering** - Real-time order tracking and management
- **Payment Integration** - Secure payment processing with multiple methods
- **Push Notifications** - Real-time order updates and alerts
- **Offline Support** - Continue ordering without internet connection
- **Biometric Authentication** - Fingerprint and Face ID support

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app for testing

### Installation
   ```bash
# Clone repository
git clone https://github.com/exsolvia/kampyn-mobile.git
cd kampyn-mobile

# Install dependencies
   npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
    npx expo start
   ```

### Running the App
- **iOS Simulator:** Press `i` in terminal
- **Android Emulator:** Press `a` in terminal
- **Physical Device:** Scan QR code with Expo Go app

## Environment Variables
```env
BACKEND_URL=your_backend_api_url
GOOGLE_CLIENT_ID=your_google_client_id
RAZORPAY_KEY_ID=your_razorpay_key_id
EXPO_PUSH_TOKEN=your_expo_push_token
```

## Documentation
- [Documentation Overview](./docs/README.md)
- [Development Guide](./docs/DEVELOPMENT_GUIDE.md)
- [Component Library](./docs/COMPONENT_LIBRARY.md)
- [Build & Deployment](./docs/BUILD_DEPLOYMENT.md)

## Development Workflow

### Branch Naming Convention
- **Features:** `feature/feature-description`
- **Bug Fixes:** `fix/bug-description`
- **Hotfixes:** `hotfix/critical-fix-description`

### Commit Message Format
```bash
# Feature development
git commit -m "feat: implement user authentication system"

# Bug fixes
git commit -m "fix: resolve payment validation issue"

# Documentation updates
git commit -m "docs: update component documentation"
```

## Build & Deployment

### Development
```bash
npx expo start
```

### Production Build
```bash
# Build for iOS
npx eas build --platform ios

# Build for Android
npx eas build --platform android

# Build for both platforms
npx eas build --platform all
```

### App Store Deployment
```bash
# Submit to App Store
npx eas submit --platform ios

# Submit to Google Play Store
npx eas submit --platform android
```

### Over-the-Air Updates
```bash
# Publish update
npx eas update --branch production --message "Bug fixes and improvements"
```

## Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'feat: add new feature'`)
4. Push to your branch (`git push origin feature/your-feature`)
5. Open a pull request

## License
This project is licensed under the MIT License.

## Support & Contact
- **Contact:** [contact@kampyn.com](mailto:contact@kampyn.com)

---

**© 2025 EXSOLVIA. All rights reserved.**