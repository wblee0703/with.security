import { registerPlugin, Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import { getHolidayName } from '../data/holidays.js';

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
 * Scan device for installed security / corporate applications
 * @returns {Promise<Array<{packageName: string, label: string}>>}
 */
export async function scanInstalledSecurityApps() {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeAppLauncher.scanSecurityApps();
      return res?.apps || [];
    } catch (e) {
      console.warn('scanSecurityApps error:', e);
    }
  }
  return [];
}

/**
 * Checks if device camera is blocked/disabled by enterprise MDM/Knox/SSM security policy
 * @returns {Promise<{ isBlocked: boolean, reason: string }>}
 */
export async function checkCameraSecurityStatus() {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeAppLauncher.checkCameraSecurityStatus();
      if (res && typeof res.isBlocked === 'boolean') {
        return res;
      }
    } catch (e) {
      console.warn('NativeAppLauncher checkCameraSecurityStatus error:', e);
    }
  }
  return { isBlocked: false, reason: 'NOT_NATIVE' };
}

/**
 * Launch external application and VERIFY that the app actually opened on mobile screen (focus lost).
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
    return new Promise((resolve) => {
      let appOpened = false;

      const handleAppBlur = () => {
        appOpened = true;
      };

      // Listen to window blur & visibility change to verify focus actually left App A
      window.addEventListener('blur', handleAppBlur, { once: true });
      document.addEventListener('visibilitychange', handleAppBlur, { once: true });

      // Attempt launch via Native Java Plugin
      NativeAppLauncher.launchApp({ target: cleanScheme })
        .then((res) => {
          appOpened = true;
        })
        .catch((err) => {
          console.warn('NativeAppLauncher.launchApp failed, trying Capacitor AppLauncher fallback:', err);
          if (cleanScheme.startsWith('intent://') || cleanScheme.includes('://')) {
            AppLauncher.openUrl({ url: cleanScheme })
              .then(() => { appOpened = true; })
              .catch(() => {});
          }
        });

      // Wait 1000ms to verify if OS transferred focus to the newly opened app (B app)
      setTimeout(() => {
        window.removeEventListener('blur', handleAppBlur);
        document.removeEventListener('visibilitychange', handleAppBlur);

        if (appOpened || document.hidden) {
          resolve({ success: true, method: 'native-verified' });
        } else {
          resolve({ 
            success: false, 
            method: 'native-not-opened', 
            reason: '앱이 핸드폰에 설치되어 있지 않거나 모바일 화면에 열리지 않았습니다.' 
          });
        }
      }, 1000);
    });
  }

  // 2. Web Browser (PC & Mobile Web Browser)
  try {
    if (cleanScheme.startsWith('intent://') || cleanScheme.includes('://')) {
      const a = document.createElement('a');
      a.href = cleanScheme;
      a.click();
    }
  } catch (e) {}

  return { 
    success: true, 
    method: 'web-compatible' 
  };
}

/**
 * Share text via Native Share Intent (KakaoTalk, SMS, Email, etc.) or Web Share API
 * @param {{ title: string, text: string }} options
 * @returns {Promise<{ success: boolean, aborted?: boolean }>}
 */
export async function shareReportText({ title, text }) {
  if (Capacitor.isNativePlatform()) {
    try {
      await NativeAppLauncher.shareText({ title, text });
      return { success: true };
    } catch (e) {
      console.warn('NativeAppLauncher.shareText error, trying navigator.share fallback:', e);
      if (navigator.share) {
        try {
          await navigator.share({ title, text });
          return { success: true };
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') return { success: false, aborted: true };
        }
      }
    }
  } else if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return { success: true };
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') return { success: false, aborted: true };
    }
  }
  return { success: false };
}

/**
 * Synchronize current work logs to Android Native Home Screen Calendar Widget (Excluding TBM & Security Pledges)
 * @param {{ workLogs?: Array<any> }} options
 */
export async function syncCalendarWidget({ workLogs = [] } = {}) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const workDatesMap = {};

    // TBM 및 보안서약 항목 배제 (순수 업무 일지만 위젯에 반영)
    const validLogs = (workLogs || []).filter(log => {
      if (!log) return false;
      const title = String(log.workTitle || log.title || log.content || '').toLowerCase();
      const cat = String(log.category || '').toLowerCase();
      const sub = String(log.subCategory || log.sub_category || '').toLowerCase();
      if (title.includes('보안서약') || title.includes('서약') || title.includes('tbm')) return false;
      if (cat.includes('보안서약') || cat.includes('tbm')) return false;
      if (sub.includes('보안서약') || sub.includes('서약') || sub.includes('tbm')) return false;
      return true;
    });

    // Collect all distinct dates from valid workLogs (including due dates)
    const allDates = new Set();
    validLogs.forEach(log => {
      const date = log.date || (log.createdAt ? log.createdAt.split('T')[0] : null);
      if (date) allDates.add(date);
      const due = log.dueDate || log.due_date;
      if (due) allDates.add(due);
    });

    allDates.forEach(dateStr => {
      const dateLogs = validLogs.filter(l => (l.date || '').startsWith(dateStr));
      const dueLogs = validLogs.filter(l => (l.dueDate || l.due_date || '').startsWith(dateStr));

      let hasBusinessTrip = false;
      let tripSiteName = '';
      let hasInternalWork = false;
      const hasDueTask = dueLogs.length > 0;

      dateLogs.forEach(l => {
        const isTrip = l.category === '출장 업무' || Boolean(l.siteName || l.site_name);
        if (isTrip) {
          hasBusinessTrip = true;
          const s = (l.siteName || l.site_name || '').trim();
          if (!tripSiteName && s) tripSiteName = s;
        } else {
          hasInternalWork = true;
        }
      });

      let cellWorkText = '';
      let category = '';

      const tripLogs = dateLogs.filter(l => l.category === '출장 업무' || Boolean(l.siteName || l.site_name));
      const internalLogs = dateLogs.filter(l => !(l.category === '출장 업무' || Boolean(l.siteName || l.site_name)));

      let tripSubCat = '';
      if (tripLogs.length > 0) {
        tripSubCat = (tripLogs[0].subCategory || tripLogs[0].sub_category || '작업').trim();
      }

      let internalSubCat = '';
      if (internalLogs.length > 0) {
        internalSubCat = (internalLogs[0].subCategory || internalLogs[0].sub_category || '일반업무').trim();
      }

      if (hasBusinessTrip) {
        category = '출장';
        if (tripSiteName) {
          // Remove redundant '출장' suffix if present; just display site name (e.g. 'SKH 이천사업장')
          const cleanedSite = tripSiteName.replace(/\s*출장$/g, '').trim();
          const baseSite = cleanedSite || tripSiteName;
          const subText = tripSubCat ? ` ${tripSubCat}` : '';
          if (tripLogs.length > 1) {
            cellWorkText = `${baseSite}${subText} ${tripLogs.length}건`;
          } else {
            cellWorkText = `${baseSite}${subText}`;
          }
        } else {
          cellWorkText = tripSubCat ? `출장 ${tripSubCat}` : '출장지';
        }
      } else if (hasDueTask && dateLogs.length === 0) {
        category = '납기';
        cellWorkText = '[납기]';
      } else if (hasInternalWork || dateLogs.length > 0) {
        category = '사내';
        const count = internalLogs.length > 0 ? internalLogs.length : dateLogs.length;
        cellWorkText = `사내업무 ${count}건`;
      }

      let summaryText = '';
      let status = '업무 등록됨';

      if (hasBusinessTrip) {
        status = '출장업무';
        const cleanedSite = tripSiteName ? tripSiteName.replace(/\s*출장$/g, '').trim() : '출장지';
        const subCat = tripSubCat || '작업';
        if (dateLogs.length > 1) {
          summaryText = `출장업무[${cleanedSite}, ${subCat}] 외 ${dateLogs.length - 1}건`;
        } else {
          summaryText = `출장업무[${cleanedSite}, ${subCat}]`;
        }
      } else if (hasInternalWork || dateLogs.length > 0) {
        status = '사내업무';
        const subCat = internalSubCat || '일반업무';
        if (dateLogs.length > 1) {
          summaryText = `사내업무 [${subCat}] 외 ${dateLogs.length - 1}건`;
        } else {
          summaryText = `사내업무 [${subCat}]`;
        }
      } else if (hasDueTask) {
        status = '납기 예정';
        const dueTitle = (dueLogs[0].workTitle || dueLogs[0].title || '업무 납기일').trim();
        if (dueLogs.length > 1) {
          summaryText = `[납기] ${dueTitle} 외 ${dueLogs.length - 1}건`;
        } else {
          summaryText = `[납기] ${dueTitle}`;
        }
      }

      let title = summaryText || (dateLogs.length > 0 ? (dateLogs[0].workTitle || dateLogs[0].title || '일일 업무') : '');
      let site = tripSiteName;

      workDatesMap[dateStr] = {
        hasWork: Boolean(summaryText || dateLogs.length > 0 || hasDueTask),
        summaryText,
        title,
        site,
        subCategory: hasBusinessTrip ? (tripSubCat || '작업') : (internalSubCat || '일반업무'),
        status,
        category,
        cellWorkText,
        holidayName: getHolidayName(dateStr) || '',
        count: dateLogs.length
      };
    });

    // Find today's specific info
    const todayInfo = workDatesMap[todayStr];
    let todayTitle = todayInfo ? (todayInfo.summaryText || todayInfo.title) : '';
    let todaySite = todayInfo ? todayInfo.site : '';
    let todayStatus = todayInfo ? todayInfo.status : '일정 없음';

    await NativeAppLauncher.updateWidgetData({
      workDatesJson: JSON.stringify(workDatesMap),
      todayTitle,
      todaySite,
      todayStatus
    });
  } catch (err) {
    console.warn('syncCalendarWidget error:', err);
  }
}

/**
 * Check if the app was launched by tapping the Android Home Screen Widget
 * @returns {Promise<{ fromWidget: boolean, targetTab: string, targetDate: string }>}
 */
export async function checkWidgetLaunchIntent() {
  if (!Capacitor.isNativePlatform()) {
    return { fromWidget: false, targetTab: '', targetDate: '' };
  }

  try {
    const res = await NativeAppLauncher.getWidgetLaunchData();
    return res || { fromWidget: false, targetTab: '', targetDate: '' };
  } catch (err) {
    console.warn('checkWidgetLaunchIntent error:', err);
    return { fromWidget: false, targetTab: '', targetDate: '' };
  }
}

