// Global Modal Back-Button Stack Handler
// Supports Android Native Hardware/Gesture Back, iOS Swipe/Back, Browser Navigation Back & Desktop ESC key

class ModalBackHandler {
  constructor() {
    this.stack = [];
    this.lastBackPressTime = 0;
    this.isInitialized = false;
    this.init();
  }

  init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Android Native Back Button Bridge Interface for MainActivity.java
    window.__handleNativeBackPressed = () => {
      if (this.hasOpenModals()) {
        this.closeTopModal();
        return true;
      }

      // If no modals are open: double-back press within 3 seconds to exit app
      const now = Date.now();
      if (this.lastBackPressTime && (now - this.lastBackPressTime < 3000)) {
        // Second press within 3 seconds -> allow app to close/exit
        this.lastBackPressTime = 0;
        return false;
      }

      // First press -> record timestamp and show toast warning for 3 seconds
      this.lastBackPressTime = now;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('with_security_toast', {
          detail: { message: "'뒤로' 버튼을 한 번 더 누르면 앱이 종료됩니다.", type: 'info' }
        }));
      }
      return true;
    };

    // 2. Listen to browser & Android WebView popstate events
    window.addEventListener('popstate', (e) => {
      if (this.stack.length > 0) {
        const topModal = this.stack.pop();
        if (topModal && typeof topModal.close === 'function') {
          try {
            topModal.close();
          } catch (err) {
            console.warn('Error closing modal on popstate:', err);
          }
        }
      }
    });

    // 3. Support Desktop Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.stack.length > 0) {
        this.closeTopModal();
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
