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
- **Feature Tabs (`src/components/tabs/`)**: Independent functional views/tabs (e.g. `SecurityChecklistTab.jsx`, `WorkLogTab.jsx`, `WorkSummaryTab.jsx`, `SiteSettingTab.jsx`, `UserSettingTab.jsx`).
- **Common Components (`src/components/common/`)**: Shared reusable UI elements (e.g. `SignatureCanvas.jsx`).
- **Services & Logic (`src/services/`)**: Business logic, Web Crypto encryption (`cryptoUtil.js`), and IndexedDB persistence (`dbService.js`).
- **Entry HTML & CSS (`index.html` & `src/index.css`)**: Root HTML entry (`index.html`) and single application stylesheet (`src/index.css`).
- **Relative Path Consistency**: Maintain relative path integrity across imports (`../layout/`, `../tabs/`, `../common/`, `../services/`).

## 5. Primary Ground-Truth Data Rules (`src/data/*.json`)
- **Primary Data Baseline (`src/data/*.json`)**: All core application data (users, sites, pledges) MUST treat `src/data/*.json` files (`users.json`, `sites.json`, `pledges.json`) as the primary ground-truth source.
- **Prevent Cookie / Cache Overwriting**: Browser cookies, local storage, and IndexedDB caches MUST NEVER overwrite or supersede edits made to `src/data/*.json`. Data fetching logic MUST always prioritize and merge `src/data/*.json` contents on top of cached state.

## 6. Site & User Identity Evaluation Rules (사업장 및 동일인 식별 규칙)
- **Site Identity Evaluation (사업장 식별 규칙)**: Always differentiate and identify sites by combining **Site Name (`name`) AND Site Address (`address`)**. Sites with matching names but different addresses (or vice versa) MUST be treated as separate, distinct sites.
- **User Identity Evaluation (동일인 식별 규칙)**: Differentiate and evaluate user identity using **User ID (`username` / `id`), Department/Team (`team` / `department`), Rank (`rank`), AND Name (`name` / `visitorName`)**. If ANY single field differs among these 4 parameters (ID, 소속, 직급, 이름 중 1개라도 다르면), they MUST be evaluated as DIFFERENT persons (다른 사람으로 판단).

## 7. App vs. Web Browser Environment Separation Rules (모바일 앱과 웹 브라우저 환경 분리 관리 규칙)
- **Security Context Differentiation (보안 환경 분리 원칙)**:
  - **Native Mobile App (`Capacitor.isNativePlatform()`)**:
    - 외부 기업 보안 어플 연동(삼성 Knox/MDM, SK하이닉스 SSM, LGD 디바이스온 등) 및 실행 검증은 모바일 전용 네이티브 앱(APK) 환경에서만 독점적으로 활성화 및 실행되어야 합니다.
    - 사업장 출입 보안 서약(`entryCheck`) 및 현장 방문자 출입 관제 기능이 기본 제공됩니다.
  - **Web Browser (PC 및 모바일 인터넷 브라우저 / `!Capacitor.isNativePlatform()`)**:
    - 일반 웹 브라우저 접속자는 업무 일지(`workLog`), 출입증 조회 등 웹 표준 기능 위주로 제공되며, 외부 타 어플 실행 및 일반 사용자 대상 보안 서약(`entryCheck`)은 숨김/비활성화 처리합니다.
    - **개발자 예외 권한 (`role === '개발자'` 또는 `username === 'admin'`)**: 개발자 및 관리자는 웹 브라우저에서도 모바일 보안 서약(`entryCheck`) 및 환경 설정 메뉴에 접근하여 테스트 및 유지보수를 수행할 수 있습니다.
- **Request Boundary Separation (요청 사항 분리 처리)**:
  - 사용자가 **앱(APK) 전용 기능**(어플 간 연동, 네이티브 인텐트, 백그라운드 포커스 제어, 패키지 스캔 등)을 요청할 때는 웹 브라우저 런타임에 간섭이 없도록 `android/` 네이티브 레이어 및 `Capacitor.isNativePlatform()` 분기 내에서 철저히 격리 개발합니다.
  - 사용자가 **웹 브라우저 및 호스팅 관련 기능**(가비아 웹호스팅, Node.js REST API, 웹 대시보드, CORS 등)을 요청할 때는 모바일 네이티브 앱의 동작 안정성을 저해하지 않도록 명확히 분리하여 관리합니다.
