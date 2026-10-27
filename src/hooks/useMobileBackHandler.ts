"use client";

import { useEffect, useRef } from "react";

interface OverlaysState {
  isSidebarOpen: boolean;
  selectedEvent: boolean;
  isEventModalOpen: boolean;
  isCalendarModalOpen: boolean;
  isInviteModalOpen: boolean;
  isProfileModalOpen: boolean;
}

interface OverlaysCloseHandlers {
  closeSidebar: () => void;
  closeDetail: () => void;
  closeEventModal: () => void;
  closeCalendarModal: () => void;
  closeInviteModal: () => void;
  closeProfileModal: () => void;
}

/**
 * Handles Android Hardware / Gesture Back Button (`popstate`) for mobile modals and drawers.
 *
 * 1. Automatically pushes history state when a modal/drawer opens.
 * 2. Intercepts Android Back button to close the active modal/drawer instead of leaving the app.
 * 3. Keeps history in sync when a modal/drawer is closed via UI clicks.
 * 4. Ensures logged-in users never get sent back to `/login`.
 */
export function useMobileBackHandler(
  state: OverlaysState,
  handlers: OverlaysCloseHandlers
) {
  const isPoppingRef = useRef(false);
  const pushedCountRef = useRef(0);

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const stateRef = useRef(state);
  stateRef.current = state;

  // On mount: replace current history entry so `/login` is never accessible via back
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.history.replaceState({ mytreeRoot: true }, "");
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Track transitions of overlay open/close
  const prevAnyOpenRef = useRef(false);

  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    const nowOpen =
      (state.isSidebarOpen && isMobile) ||
      state.selectedEvent ||
      state.isEventModalOpen ||
      state.isCalendarModalOpen ||
      state.isInviteModalOpen ||
      state.isProfileModalOpen;

    if (nowOpen && !prevAnyOpenRef.current) {
      // Transition from NO open overlay to AT LEAST ONE open overlay
      if (!isPoppingRef.current) {
        window.history.pushState({ mytreeModal: true }, "");
        pushedCountRef.current += 1;
      }
    } else if (!nowOpen && prevAnyOpenRef.current) {
      // Transition from SOME open overlay to NO open overlays via UI action
      if (!isPoppingRef.current && pushedCountRef.current > 0) {
        pushedCountRef.current -= 1;
        window.history.back();
      }
    }

    prevAnyOpenRef.current = nowOpen;
  }, [
    state.isSidebarOpen,
    state.selectedEvent,
    state.isEventModalOpen,
    state.isCalendarModalOpen,
    state.isInviteModalOpen,
    state.isProfileModalOpen,
  ]);

  // Listen to popstate event (triggered by Android hardware / gesture back button)
  useEffect(() => {
    const handlePopState = () => {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
      const cur = stateRef.current;
      const h = handlersRef.current;

      const hasOpenOverlay =
        (cur.isSidebarOpen && isMobile) ||
        cur.selectedEvent ||
        cur.isEventModalOpen ||
        cur.isCalendarModalOpen ||
        cur.isInviteModalOpen ||
        cur.isProfileModalOpen;

      if (hasOpenOverlay) {
        isPoppingRef.current = true;
        if (pushedCountRef.current > 0) {
          pushedCountRef.current -= 1;
        }

        // Close in top-to-bottom priority order
        if (cur.selectedEvent) {
          h.closeDetail();
        } else if (cur.isEventModalOpen) {
          h.closeEventModal();
        } else if (cur.isProfileModalOpen) {
          h.closeProfileModal();
        } else if (cur.isCalendarModalOpen) {
          h.closeCalendarModal();
        } else if (cur.isInviteModalOpen) {
          h.closeInviteModal();
        } else if (cur.isSidebarOpen && isMobile) {
          h.closeSidebar();
        }

        setTimeout(() => {
          isPoppingRef.current = false;
        }, 100);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
}
