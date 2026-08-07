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

## 4. Directory Structure & File Organization Rules
- **HTML Templates (`template/`)**: All `.html` files MUST be created and managed under the `template/` directory (e.g. `template/home.html`, `template/demo.html`).
- **Stylesheets (`stylesheet/`)**: All `.css` files MUST be created and managed under the `stylesheet/` directory (e.g. `stylesheet/home.css`).
- **JavaScript Files (`javascript/`)**: All `.js` files MUST be created and managed under the `javascript/` directory (e.g. `javascript/home.js`, `javascript/dbService.js`, `javascript/cryptoUtil.js`).
- **Relative Path Consistency**: All HTML templates must reference stylesheets via `../stylesheet/` and JavaScript files via `../javascript/`.

