import { registerPlugin, Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';

const NativeAppLauncher = registerPlugin('NativeAppLauncher');

/**
 * Checks if target external app is installed on native device
 * @param {string} targetScheme
 * @returns {Promise<boolean>}
 */
export async function checkIsAppInstalled(targetScheme) {
  if (!targetScheme) return false;
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeAppLauncher.isAppInstalled({ target: targetScheme.trim() });
      return !!res?.installed;
    } catch (e) {
      console.warn('NativeAppLauncher isAppInstalled error:', e);
    }
  }
  return false;
}

/**
 * Launch external application (e.g. SK Hynix SSM, Samsung Knox, AhnLab V3, custom schemes, package names).
 * Supported ONLY inside Native Mobile App (APK). Disabled on Web Browsers as requested.
 * @param {string} targetScheme
 * @returns {Promise<{ success: boolean, method: string, reason?: string }>}
 */
export async function launchApp(targetScheme) {
  if (!targetScheme || !targetScheme.trim()) {
    return { success: false, method: 'empty' };
  }

  const cleanScheme = targetScheme.trim();

  // 1. Native Capacitor Environment (Android APK / iOS App) ONLY
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeAppLauncher.launchApp({ target: cleanScheme });
      if (res && res.success) {
        return { success: true, method: 'native-plugin' };
      }
    } catch (err) {
      console.warn('NativeAppLauncher.launchApp failed, trying Capacitor AppLauncher fallback:', err);
    }

    // Secondary Native Fallback via standard Capacitor AppLauncher
    try {
      if (cleanScheme.startsWith('intent://') || cleanScheme.includes('://')) {
        await AppLauncher.openUrl({ url: cleanScheme });
        return { success: true, method: 'capacitor-app-launcher' };
      }
    } catch (err) {
      console.warn('AppLauncher.openUrl fallback failed:', err);
    }

    return { success: false, method: 'native-fail' };
  }

  // 2. Web Browser (PC & Mobile Internet Browser) - Disabled (Only allowed in APK app)
  console.log('🌐 Web Browser access detected: External app launching is disabled in Web Browsers.');
  return { 
    success: false, 
    method: 'web-disabled', 
    reason: '타 어플 실행 기능은 모바일 전용 설치형 앱(APK)에서만 지원됩니다.' 
  };
}
