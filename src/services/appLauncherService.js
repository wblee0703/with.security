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
 * Synchronize current work logs and TBM data to Android Native Home Screen Calendar Widget
 * @param {{ workLogs?: Array<any>, tbms?: Array<any> }} options
 */
export async function syncCalendarWidget({ workLogs = [], tbms = [] }) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const workDatesMap = {};

    // Collect all distinct dates from workLogs and tbms (including due dates)
    const allDates = new Set();
    (workLogs || []).forEach(log => {
      const date = log.date || (log.createdAt ? log.createdAt.split('T')[0] : null);
      if (date) allDates.add(date);
      const due = log.dueDate || log.due_date;
      if (due) allDates.add(due);
    });
    (tbms || []).forEach(tbm => {
      const date = tbm.date || (tbm.createdAt ? tbm.createdAt.split('T')[0] : null);
      if (date) allDates.add(date);
    });

    allDates.forEach(dateStr => {
      const dateLogs = (workLogs || []).filter(l => (l.date || '').startsWith(dateStr));
      const dueLogs = (workLogs || []).filter(l => (l.dueDate || l.due_date || '').startsWith(dateStr));
      const dateTbms = (tbms || []).filter(t => (t.date || '').startsWith(dateStr));

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

      dateTbms.forEach(t => {
        const s = (t.site || '').trim();
        if (s) {
          hasBusinessTrip = true;
          if (!tripSiteName) tripSiteName = s;
        } else {
          hasInternalWork = true;
        }
      });

      let cellWorkText = '';
      let category = '';

      if (hasBusinessTrip) {
        category = '출장';
        if (tripSiteName) {
          // Remove redundant '출장' suffix if present; just display site name (e.g. 'SKH 이천사업장')
          const cleanedSite = tripSiteName.replace(/\s*출장$/g, '').trim();
          cellWorkText = cleanedSite || tripSiteName;
        } else {
          cellWorkText = '출장지';
        }
      } else if (hasDueTask && dateLogs.length === 0 && dateTbms.length === 0) {
        category = '납기';
        cellWorkText = '[납기]';
      } else if (hasInternalWork || dateLogs.length > 0 || dateTbms.length > 0) {
        category = '사내';
        cellWorkText = '사내업무';
      }

      let title = '';
      let site = tripSiteName;
      let status = '점검 대기';

      if (dateLogs.length > 0) {
        const first = dateLogs[0];
        title = first.workTitle || first.title || first.content || '일일 업무';
        if (!site) site = first.site || first.siteName || '';
        if (dateLogs.length > 1) {
          title = `${title} 외 ${dateLogs.length - 1}건`;
        }
      } else if (dueLogs.length > 0) {
        const firstDue = dueLogs[0];
        title = `[납기] ${firstDue.workTitle || firstDue.title || '업무 납기일'}`;
        status = '납기 예정';
        if (dueLogs.length > 1) {
          title = `${title} 외 ${dueLogs.length - 1}건`;
        }
      } else if (dateTbms.length > 0) {
        const firstTbm = dateTbms[0];
        title = firstTbm.workTitle || 'TBM 진행';
        if (!site) site = firstTbm.site || '';
        if (dateTbms.length > 1) {
          title = `${title} 외 ${dateTbms.length - 1}건`;
        }
      }

      if (dateTbms.length > 0) {
        const isCompleted = dateTbms.some(t => t.postCheck?.isCompleted || t.status === 'completed');
        status = isCompleted ? 'TBM 완료' : 'TBM 진행중';
      } else if (dateLogs.length > 0) {
        status = '업무 등록됨';
      }

      workDatesMap[dateStr] = {
        hasWork: true,
        title,
        site,
        status,
        category,
        cellWorkText,
        holidayName: getHolidayName(dateStr) || '',
        count: dateLogs.length + dateTbms.length
      };
    });

    // Find today's specific info
    const todayInfo = workDatesMap[todayStr];
    let todayTitle = todayInfo ? todayInfo.title : '';
    let todaySite = todayInfo ? todayInfo.site : '';
    let todayStatus = todayInfo ? todayInfo.status : '점검 대기';

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

