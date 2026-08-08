# Project Rules & Guidelines (with.security)

## 1. Cross-Platform Compatibility (iOS, Android, Web)
- **Responsive Layout**: Always design components to adapt seamlessly between Desktop Web, iOS Safari, and Android Chrome.
- **Mobile Touch & Notches**: Support `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` for mobile notches and home indicators. Handle both touch and mouse events gracefully.
- **PWA & Native Readiness**: Keep components clean and modular so they can easily be packaged via Capacitor or React Native for App Store (iOS) and Play Store (Android) distribution.

## 2. Resource & Credit Optimization
- **Concise Execution**: Perform edits and tool interactions efficiently with minimal redundant calls.
- **Clear & Compact Communication**: Keep responses structured, concise, and focused on actionable solutions without unnecessary fluff.

## 3. Continuous Security Auditing & Improvements
- **Strict Input Validation & Sanitization**: Ensure all form inputs, PIN codes, signatures, and uploads are validated and sanitized.
- **Encryption & Key Management**: Apply proper client/server-side encryption standards for sensitive data (e.g., Vault secrets, Access Passes, OTP tokens).
- **Secure Communication & Headers**: Enforce HTTPS/WSS standards, CORS control, and token authentication protocols.

## 4. Single Source (`src/`) Directory Structure & Component Architecture Rules
- **Single Source of Truth (`src/`)**: All application source code, components, services, and styles MUST reside under `src/`.
- **Layout Components (`src/components/layout/`)**: Main shell and container components (e.g. `MobileContainer.jsx`, `WebDesktopLayout.jsx`, `PinLockModal.jsx`).
- **Feature Tabs (`src/components/tabs/`)**: Independent functional views/tabs (e.g. `SiteSecurityChecklistTab.jsx`, `AccessPassTab.jsx`, `OtpAuthenticatorTab.jsx`, `EncryptedVaultTab.jsx`, `IncidentReportTab.jsx`).
- **Common Components (`src/components/common/`)**: Shared reusable UI elements (e.g. `SignatureCanvas.jsx`).
- **Services & Logic (`src/services/`)**: Business logic, Web Crypto encryption (`cryptoUtil.js`), and IndexedDB persistence (`dbService.js`).
- **Entry HTML & CSS (`index.html` & `src/index.css`)**: Root HTML entry (`index.html`) and single application stylesheet (`src/index.css`).
- **Relative Path Consistency**: Maintain relative path integrity across imports (`../layout/`, `../tabs/`, `../common/`, `../services/`).

## 5. Primary Ground-Truth Data Rules (`src/data/*.json`)
- **Primary Data Baseline (`src/data/*.json`)**: All core application data (users, sites, pledges) MUST treat `src/data/*.json` files (`users.json`, `sites.json`, `pledges.json`) as the primary ground-truth source.
- **Prevent Cookie / Cache Overwriting**: Browser cookies, local storage, and IndexedDB caches MUST NEVER overwrite or supersede edits made to `src/data/*.json`. Data fetching logic MUST always prioritize and merge `src/data/*.json` contents on top of cached state.
