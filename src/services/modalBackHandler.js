// Global Modal Back-Button Stack Handler
// Supports Android Native Hardware/Gesture Back, iOS Swipe/Back, Browser Navigation Back & Desktop ESC key

class ModalBackHandler {
  constructor() {
    this.stack = [];
    this.lastBackPressTime = 0;
    this.isInitialized = false;
    this.suppressNextPopstateCount = 0;
    this.init();
  }

  init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Seed an initial history state on mobile web to trap browser back gesture
    try {
      if (!window.history.state || !window.history.state.isAppRoot) {
        window.history.pushState({ isAppRoot: true }, '');
      }
    } catch (e) {}

    // 1. Android Native Back Button Bridge Interface for MainActivity.java
    window.__handleNativeBackPressed = () => {
      if (this.hasOpenModals()) {
        this.closeTopModal();
        return true;
      }

      // 네이티브 APK 앱: 팝업창 없이 2초 내 연속 뒤로가기 시 즉시 종료 (더블백 토스트 안내)
      const now = Date.now();
      if (now - this.lastBackPressTime < 2000) {
        try {
          if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
            window.Capacitor.Plugins.App.exitApp();
            return true;
          }
        } catch (e) {}
        return false; // MainActivity의 super.onBackPressed() 호출로 기본 앱 종료
      } else {
        this.lastBackPressTime = now;
        window.dispatchEvent(new CustomEvent('with_security_exit_prompt', {
          detail: { message: "'뒤로' 버튼을 한 번 더 누르면 앱이 종료됩니다." }
        }));
        return true;
      }
    };

    // 2. Listen to browser & Mobile Web popstate events
    window.addEventListener('popstate', (e) => {
      // If back was triggered programmatically (e.g. clicking 'X' or 'Cancel' in modal), ignore this event
      if (this.suppressNextPopstateCount > 0) {
        this.suppressNextPopstateCount--;
        return;
      }

      if (this.hasOpenModals()) {
        const topModal = this.stack.pop();
        if (topModal && typeof topModal.close === 'function') {
          try {
            topModal.close();
          } catch (err) {
            console.warn('Error closing modal on popstate:', err);
          }
        }
      } else {
        // 모바일 웹 환경 (네이티브 앱이 아닌 웹 브라우저 모바일 모드)
        const isNative = Boolean(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

        if (!isNative) {
          // Trap back button at root and prompt exit confirmation popup
          try {
            window.history.pushState({ isAppRoot: true }, '');
          } catch (err) {}
          window.dispatchEvent(new CustomEvent('with_security_request_exit'));
        }
      }
    });

    // 3. Support Desktop Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.hasOpenModals()) {
          this.closeTopModal();
        }
      }
    });
  }

  /**
   * Register a modal when it opens
   * @param {string} id Unique identifier for the modal
   * @param {Function} closeFn Function to invoke when back button is pressed
   */
  openModal(id, closeFn) {
    if (!id || typeof closeFn !== 'function') return;

    // Check if already registered
    const existingIndex = this.stack.findIndex(m => m.id === id);
    if (existingIndex !== -1) {
      this.stack.splice(existingIndex, 1);
    }

    this.stack.push({ id, close: closeFn });

    // Push history state if not already pushed for this modal
    try {
      if (!window.history.state || window.history.state.modalBackId !== id) {
        window.history.pushState({ modalBackId: id, timestamp: Date.now() }, '');
      }
    } catch (e) {
      console.warn('Modal pushState error:', e);
    }
  }

  /**
   * Unregister a modal when closed via UI (e.g. clicking 'X' or Cancel)
   * @param {string} id
   */
  closeModal(id) {
    const index = this.stack.findIndex(m => m.id === id);
    if (index !== -1) {
      this.stack.splice(index, 1);
      try {
        if (window.history.state && window.history.state.modalBackId === id) {
          this.suppressNextPopstateCount++;
          window.history.back();
        }
      } catch (e) {}
    }
  }

  /**
   * Close the top-most modal manually (called by native Android back press or ESC key)
   */
  closeTopModal() {
    if (this.stack.length > 0) {
      const top = this.stack.pop();
      if (top && typeof top.close === 'function') {
        try {
          top.close();
        } catch (err) {
          console.warn('Error closing top modal:', err);
        }
      }
      try {
        if (window.history.state && window.history.state.modalBackId) {
          this.suppressNextPopstateCount++;
          window.history.back();
        }
      } catch (e) {}
    }
  }

  hasOpenModals() {
    return this.stack.length > 0;
  }
}

export const modalBackHandler = new ModalBackHandler();

import { useEffect, useRef } from 'react';

/**
 * Custom React Hook to connect any Modal's open/close state with Android/Browser Back Button
 * @param {boolean} isOpen Whether modal is currently visible
 * @param {Function} onClose Callback to close the modal
 * @param {string} modalId Unique identifier for this modal
 */
export function useModalBack(isOpen, onClose, modalId) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      const id = modalId || `modal-${Date.now()}-${Math.random()}`;
      modalBackHandler.openModal(id, () => {
        if (typeof onCloseRef.current === 'function') {
          onCloseRef.current();
        }
      });
      return () => {
        modalBackHandler.closeModal(id);
      };
    }
  }, [isOpen, modalId]);
}
