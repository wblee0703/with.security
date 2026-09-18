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
        const cat = (l.category || '').trim();
        const site = (l.siteName || l.site_name || '').trim();
        const isTrip = cat === '출장 업무' || (cat !== '사내 업무' && Boolean(site) && !site.includes('사내'));
        if (isTrip) {
          hasBusinessTrip = true;
          if (!tripSiteName && site) tripSiteName = site;
        } else {
          hasInternalWork = true;
        }
      });

      let cellWorkText = '';
      let category = '';

      const tripLogs = dateLogs.filter(l => {
        const cat = (l.category || '').trim();
        const site = (l.siteName || l.site_name || '').trim();
        return cat === '출장 업무' || (cat !== '사내 업무' && Boolean(site) && !site.includes('사내'));
      });
      const internalLogs = dateLogs.filter(l => {
        const cat = (l.category || '').trim();
        const site = (l.siteName || l.site_name || '').trim();
        return cat === '사내 업무' || (!cat && (!site || site.includes('사내')));
      });

      let tripSubCat = '';
      if (tripLogs.length > 0) {
        tripSubCat = (tripLogs[0].subCategory || tripLogs[0].sub_category || '작업').trim();
      }

      let internalSubCat = '';
      if (internalLogs.length > 0) {
        internalSubCat = (internalLogs[0].subCategory || internalLogs[0].sub_category || '일반업무').trim();
      }

      // 출장 업무 배지 텍스트: 1건이면 업무구분 표기, 2건 이상이면 업무구분 빼고 '외 N건'
      let tripBadgeText = '';
      if (tripLogs.length > 0) {
        const cleanedSite = (tripSiteName || '출장지').replace(/\s*출장$/g, '').trim() || '출장지';
        const sub = tripSubCat || '작업';
        if (tripLogs.length === 1) {
          tripBadgeText = `${cleanedSite} [${sub}]`;
        } else {
          tripBadgeText = `${cleanedSite} 외 ${tripLogs.length - 1}건`;
        }
      }

      // 사내 업무 배지 텍스트: 1건이면 업무구분 표기, 2건 이상이면 업무구분 빼고 '외 N건'
      let internalBadgeText = '';
      if (internalLogs.length > 0) {
        const sub = internalSubCat || '일반업무';
        if (internalLogs.length === 1) {
          internalBadgeText = `사내 [${sub}]`;
        } else {
          internalBadgeText = `사내 외 ${internalLogs.length - 1}건`;
        }
      }

      const hasBoth = tripLogs.length > 0 && internalLogs.length > 0;
      let cellTripSite = tripBadgeText;
      let cellMultiLineText = '';

      if (hasBoth) {
        category = '출장';
        cellWorkText = tripBadgeText;
        cellMultiLineText = `${tripBadgeText}\n${internalBadgeText}`;
      } else if (tripLogs.length > 0) {
        category = '출장';
        cellWorkText = tripBadgeText;
      } else if (hasDueTask && dateLogs.length === 0) {
        category = '납기';
        cellWorkText = '[납기]';
      } else if (internalLogs.length > 0 || dateLogs.length > 0) {
        category = '사내';
        cellWorkText = internalBadgeText || `사내 ${internalLogs.length}건`;
      }

      // 1) 출장 업무 텍스트 생성
      let tripText = '';
      if (tripLogs.length > 0) {
        const firstTrip = tripLogs[0];
        const rawSite = (firstTrip.siteName || firstTrip.site_name || tripSiteName || '출장지').trim();
        const site = rawSite.replace(/\s*출장$/g, '').trim() || rawSite;
        const sub = (firstTrip.subCategory || firstTrip.sub_category || '작업').trim();
        const tripTitle = (firstTrip.workTitle || firstTrip.title || '').trim();
        const detail = tripTitle && tripTitle !== sub && !tripTitle.includes(site) ? ` - ${tripTitle}` : '';
        if (tripLogs.length > 1) {
          tripText = `🚗 [출장] ${site} [${sub}]${detail} 외 ${tripLogs.length - 1}건`;
        } else {
          tripText = `🚗 [출장] ${site} [${sub}]${detail}`;
        }
      }

      // 2) 사내 업무 텍스트 생성
      let internalText = '';
      if (internalLogs.length > 0) {
        const firstInternal = internalLogs[0];
        const sub = (firstInternal.subCategory || firstInternal.sub_category || '일반업무').trim();
        const internalTitle = (firstInternal.workTitle || firstInternal.title || '').trim();
        const detail = internalTitle && internalTitle !== sub ? ` - ${internalTitle}` : '';
        if (internalLogs.length > 1) {
          internalText = `🏢 [사내] ${sub}${detail} 외 ${internalLogs.length - 1}건`;
        } else {
          internalText = `🏢 [사내] ${sub}${detail}`;
        }
      }

      // 3) 납기 예정 텍스트 생성
      let dueText = '';
      if (hasDueTask) {
        const dueTitle = (dueLogs[0].workTitle || dueLogs[0].title || '업무 납기일').trim();
        dueText = dueLogs.length > 1 ? `⏰ [납기] ${dueTitle} 외 ${dueLogs.length - 1}건` : `⏰ [납기] ${dueTitle}`;
      }

      // 4) 2줄 구분(Line 1: 출장, Line 2: 사내) 및 상태 배지 결정
      let line1 = '';
      let line2 = '';
      let status = '업무 등록됨';

      if (tripText && internalText) {
        line1 = tripText;
        line2 = internalText;
        status = '출장 · 사내';
      } else if (tripText) {
        status = '출장업무';
        line1 = tripText;
        if (tripLogs.length >= 2) {
          const secondTrip = tripLogs[1];
          const rawSite2 = (secondTrip.siteName || secondTrip.site_name || '출장지').trim();
          const site2 = rawSite2.replace(/\s*출장$/g, '').trim() || rawSite2;
          const sub2 = (secondTrip.subCategory || secondTrip.sub_category || '작업').trim();
          const title2 = (secondTrip.workTitle || secondTrip.title || '').trim();
          const detail2 = title2 && title2 !== sub2 ? ` - ${title2}` : '';
          line2 = `🚗 [출장] ${site2} [${sub2}]${detail2}`;
        } else if (dueText) {
          line2 = dueText;
        }
      } else if (internalText) {
        status = '사내업무';
        line1 = internalText;
        if (internalLogs.length >= 2) {
          const secondInternal = internalLogs[1];
          const sub2 = (secondInternal.subCategory || secondInternal.sub_category || '일반업무').trim();
          const title2 = (secondInternal.workTitle || secondInternal.title || '').trim();
          const detail2 = title2 && title2 !== sub2 ? ` - ${title2}` : '';
          line2 = `🏢 [사내] ${sub2}${detail2}`;
        } else if (dueText) {
          line2 = dueText;
        }
      } else if (dueText) {
        status = '납기 예정';
        line1 = dueText;
      } else {
        status = '일정 없음';
      }

      const summaryText = line1 && line2 ? `${line1}\n${line2}` : (line1 || line2 || '');
      const title = summaryText || (dateLogs.length > 0 ? (dateLogs[0].workTitle || dateLogs[0].title || '일일 업무') : '');
      const site = tripSiteName;

      workDatesMap[dateStr] = {
        hasWork: Boolean(line1 || line2 || dateLogs.length > 0 || hasDueTask),
        summaryText,
        line1,
        line2,
        tripText,
        internalText,
        title,
        site,
        subCategory: hasBusinessTrip ? (tripSubCat || '작업') : (internalSubCat || '일반업무'),
        status,
        category,
        cellWorkText,
        cellTripSite,
        cellMultiLineText,
        tripBadgeText,
        internalBadgeText,
        tripCount: tripLogs.length,
        internalCount: internalLogs.length,
        hasBoth,
        holidayName: getHolidayName(dateStr) || '',
        count: dateLogs.length
      };
    });

    // Find today's specific info
    const todayInfo = workDatesMap[todayStr];
    let todayTitle = todayInfo ? (todayInfo.summaryText || todayInfo.title) : '';
    let todaySite = todayInfo ? todayInfo.site : '';
    let todayStatus = todayInfo ? todayInfo.status : '일정 없음';
    let todayLine1 = todayInfo ? (todayInfo.line1 || '') : '';
    let todayLine2 = todayInfo ? (todayInfo.line2 || '') : '';

    await NativeAppLauncher.updateWidgetData({
      workDatesJson: JSON.stringify(workDatesMap),
      todayTitle,
      todaySite,
      todayStatus,
      todayLine1,
      todayLine2
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

