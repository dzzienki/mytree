"use client";

import { apiFetch, withBase } from "@/lib/base-path";
import React, { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MonthView from "@/components/MonthView";
import WeekView from "@/components/WeekView";
import ListView from "@/components/ListView";
import KeepView from "@/components/KeepView";
import FeedView from "@/components/FeedView";
import EventModal from "@/components/EventModal";
import EventDetailDrawer from "@/components/EventDetailDrawer";
import CalendarModal from "@/components/CalendarModal";
import InviteModal from "@/components/InviteModal";
import UserProfileModal from "@/components/UserProfileModal";
import { useMobileBackHandler } from "@/hooks/useMobileBackHandler";
import { useEventReminders } from "@/hooks/useEventReminders";
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { CalendarDto, EventDto, KeepItemDto, ActivityLogDto, UserDto } from "@/types";

function CalendarApp() {
  const router = useRouter();

  // Navigation & View State (with persistence across reloads / pull-to-refresh)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mytree_current_date");
        if (saved) {
          const parsed = new Date(saved);
          if (!isNaN(parsed.getTime())) return parsed;
        }
      } catch (e) {}
    }
    return new Date();
  });

  const [activeTab, setActiveTab] = useState<"month" | "week" | "list" | "keep" | "feed">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mytree_active_tab");
        if (saved && ["month", "week", "list", "keep", "feed"].includes(saved)) {
          return saved as "month" | "week" | "list" | "keep" | "feed";
        }
      } catch (e) {}
    }
    return "month";
  });
  
  // TimeTree behavior: Left menu is CLOSED by default on mobile, OPEN docked on desktop (>=1024px)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  // Auth & User State
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Calendar Data State
  const [calendars, setCalendars] = useState<CalendarDto[]>([]);
  const [activeCalendarId, setActiveCalendarId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventDto[]>([]);
  const [keepItems, setKeepItems] = useState<KeepItemDto[]>([]);
  const [activities, setActivities] = useState<ActivityLogDto[]>([]);

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventDto | null>(null);
  const [initialDateForModal, setInitialDateForModal] = useState<Date>(() => new Date());
  const [initialTitleForModal, setInitialTitleForModal] = useState("");
  const [initialDescForModal, setInitialDescForModal] = useState("");

  const [selectedEvent, setSelectedEvent] = useState<EventDto | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarToEdit, setCalendarToEdit] = useState<CalendarDto | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Android Hardware / Gesture Back Button handling for modals & sidebar drawer
  useMobileBackHandler(
    {
      isSidebarOpen,
      selectedEvent: !!selectedEvent,
      isEventModalOpen,
      isCalendarModalOpen,
      isInviteModalOpen,
      isProfileModalOpen,
    },
    {
      closeSidebar: () => setIsSidebarOpen(false),
      closeDetail: () => setSelectedEvent(null),
      closeEventModal: () => setIsEventModalOpen(false),
      closeCalendarModal: () => setIsCalendarModalOpen(false),
      closeInviteModal: () => setIsInviteModalOpen(false),
      closeProfileModal: () => setIsProfileModalOpen(false),
    }
  );

  // Scheduled Event Alarms: Notifies on start time (exact & 10 mins before)
  useEventReminders(events);

  // Derived active calendar object (NO state loop!)
  const activeCalendar = useMemo(() => {
    if (!activeCalendarId) return null;
    return calendars.find((c) => c.id === activeCalendarId) || null;
  }, [calendars, activeCalendarId]);

  // Persistent state helper functions
  const updateCurrentDate = (newDate: Date) => {
    setCurrentDate(newDate);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mytree_current_date", newDate.toISOString());
      } catch (e) {}
    }
  };

  const handleSelectTab = (tab: "month" | "week" | "list" | "keep" | "feed") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mytree_active_tab", tab);
      } catch (e) {}
    }
  };

  const handleSelectCalendar = (cal: CalendarDto | null) => {
    const nextId = cal?.id || null;
    setActiveCalendarId(nextId);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mytree_active_calendar_id", nextId === null ? "all" : nextId);
      } catch (e) {}
    }
  };

  // 1. Initial Load: Auth check and users fetch (Runs ONCE on mount)
  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndInit() {
      try {
        const authRes = await apiFetch("/api/auth/me");
        const authData = await authRes.json();

        if (!authData.user) {
          router.replace("/login");
          return;
        }

        if (isMounted) {
          setCurrentUser(authData.user);
        }
      } catch (e) {
        console.error("Auth check failed:", e);
        router.replace("/login");
      } finally {
        if (isMounted) setAuthChecking(false);
      }
    }

    checkAuthAndInit();

    // Register PWA Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register(withBase("/sw.js")).catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [router]);

  // 2. Load Calendars when currentUser is determined (Restore saved calendar selection)
  const loadCalendars = useCallback(async () => {
    try {
      const res = await apiFetch("/api/calendars");
      if (res.ok) {
        const data: CalendarDto[] = await res.json();
        setCalendars(data);
        setActiveCalendarId((prevId) => {
          if (prevId && data.some((c) => c.id === prevId)) return prevId;

          // Check saved preference in localStorage
          if (typeof window !== "undefined") {
            try {
              const saved = localStorage.getItem("mytree_active_calendar_id");
              if (saved === "all") return null;
              if (saved && data.some((c) => c.id === saved)) return saved;
            } catch (e) {}
          }

          return data[0]?.id || null;
        });
      }
    } catch (e) {
      console.error("Failed to load calendars:", e);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      loadCalendars();
    }
  }, [currentUser?.id, loadCalendars]);

  // 3. Load Events, Keep, and Activities in parallel (Only when activeCalendarId or user changes)
  const loadCalendarData = useCallback(async (calId: string | null) => {
    try {
      const calParam = calId || "all";
      const [eventsRes, keepRes, actRes] = await Promise.all([
        apiFetch(`/api/events?calendarId=${calParam}`),
        apiFetch(`/api/keep?calendarId=${calParam}`),
        apiFetch(`/api/activities?calendarId=${calParam}`),
      ]);

      if (eventsRes.ok) {
        const evData: EventDto[] = await eventsRes.json();
        setEvents(evData);
      }
      if (keepRes.ok) {
        const kpData: KeepItemDto[] = await keepRes.json();
        setKeepItems(kpData);
      }
      if (actRes.ok) {
        const actData: ActivityLogDto[] = await actRes.json();
        setActivities(actData);
      }
    } catch (e) {
      console.error("Failed to load calendar data:", e);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      loadCalendarData(activeCalendarId);
    }
  }, [currentUser?.id, activeCalendarId, loadCalendarData]);

  // Synchronize selectedEvent if it was updated
  useEffect(() => {
    if (selectedEvent) {
      const fresh = events.find((e) => e.id === selectedEvent.id);
      if (fresh) setSelectedEvent(fresh);
    }
  }, [events]);

  // Date Navigation Handlers
  const handlePrev = () => {
    if (activeTab === "month") updateCurrentDate(subMonths(currentDate, 1));
    else if (activeTab === "week") updateCurrentDate(subWeeks(currentDate, 1));
    else updateCurrentDate(subDays(currentDate, 7));
  };

  const handleNext = () => {
    if (activeTab === "month") updateCurrentDate(addMonths(currentDate, 1));
    else if (activeTab === "week") updateCurrentDate(addWeeks(currentDate, 1));
    else updateCurrentDate(addDays(currentDate, 7));
  };

  const handleToday = () => {
    updateCurrentDate(new Date());
  };

  const handleOpenNewEvent = (targetDate?: Date, initialTitle = "", initialDesc = "") => {
    setEventToEdit(null);
    setInitialDateForModal(targetDate || currentDate);
    setInitialTitleForModal(initialTitle);
    setInitialDescForModal(initialDesc);
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: EventDto) => {
    setSelectedEvent(null);
    setEventToEdit(event);
    setIsEventModalOpen(true);
  };

  const handleSelectEvent = (event: EventDto) => {
    setSelectedEvent(event);
  };

  const handleConvertToEvent = (title: string, desc: string) => {
    handleOpenNewEvent(currentDate, title, desc);
  };

  const refreshAll = () => {
    if (currentUser?.id) {
      loadCalendars();
      loadCalendarData(activeCalendarId);
    }
  };

  // Members may edit/delete only their own events; owners/admins may change any.
  const canModifySelected = (() => {
    if (!selectedEvent || !currentUser) return false;
    if (selectedEvent.creatorId === currentUser.id) return true;
    const cal = calendars.find((c) => c.id === selectedEvent.calendarId);
    const role = cal?.members.find((m) => m.userId === currentUser.id)?.role;
    return role === "OWNER" || role === "ADMIN";
  })();

  if (authChecking || !currentUser) {
    return (
      <div className="h-screen w-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100">
      {/* Top Header */}
      <Header
        activeCalendar={activeCalendar}
        calendars={calendars}
        onSelectCalendar={handleSelectCalendar}
        currentDate={currentDate}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        currentUser={currentUser}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenNewEvent={() => handleOpenNewEvent()}
        onOpenInvite={() => setIsInviteModalOpen(true)}
        onOpenNewCalendar={() => {
          setCalendarToEdit(null);
          setIsCalendarModalOpen(true);
        }}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (TimeTree-style mobile overlay drawer / desktop docked sidebar) */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          calendars={calendars}
          activeCalendar={activeCalendar}
          onSelectCalendar={handleSelectCalendar}
          currentDate={currentDate}
          onSelectDate={(d) => updateCurrentDate(d)}
          onOpenNewCalendar={() => {
            setCalendarToEdit(null);
            setIsCalendarModalOpen(true);
          }}
          onOpenEditCalendar={(cal) => {
            setCalendarToEdit(cal);
            setIsCalendarModalOpen(true);
          }}
          currentUser={currentUser}
          events={events}
          onSelectEvent={handleSelectEvent}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />

        {/* View Main Content Area (Full screen on mobile, responsive) */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white w-full">
          {activeTab === "month" && (
            <MonthView
              currentDate={currentDate}
              events={events}
              onSelectEvent={handleSelectEvent}
              onSelectDate={(d) => updateCurrentDate(d)}
              onAddEventOnDate={(d) => handleOpenNewEvent(d)}
              onPrevMonth={handlePrev}
              onNextMonth={handleNext}
            />
          )}

          {activeTab === "week" && (
            <WeekView
              currentDate={currentDate}
              events={events}
              onSelectEvent={handleSelectEvent}
              onAddEventOnDate={(d) => handleOpenNewEvent(d)}
              onPrevWeek={handlePrev}
              onNextWeek={handleNext}
            />
          )}

          {activeTab === "list" && (
            <ListView
              events={events}
              onSelectEvent={handleSelectEvent}
              onOpenNewEvent={() => handleOpenNewEvent()}
            />
          )}

          {activeTab === "keep" && (
            <KeepView
              items={keepItems}
              activeCalendar={activeCalendar}
              calendars={calendars}
              currentUser={currentUser}
              onRefresh={() => currentUser?.id && loadCalendarData(activeCalendarId)}
              onConvertToEvent={handleConvertToEvent}
            />
          )}

          {activeTab === "feed" && (
            <FeedView
              activities={activities}
              onRefresh={() => currentUser?.id && loadCalendarData(activeCalendarId)}
            />
          )}
        </main>
      </div>

      {/* Event Add/Edit Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        eventToEdit={eventToEdit}
        initialDate={initialDateForModal}
        initialTitle={initialTitleForModal}
        initialDescription={initialDescForModal}
        calendars={calendars}
        activeCalendar={activeCalendar}
        currentUser={currentUser}
        onSaved={refreshAll}
        onDeleted={() => {
          setSelectedEvent(null);
          refreshAll();
        }}
      />

      {/* Event Detail & Comments Drawer */}
      <EventDetailDrawer
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        currentUser={currentUser}
        onEdit={handleEditEvent}
        onDeleted={() => {
          setSelectedEvent(null);
          refreshAll();
        }}
        onCommentAdded={refreshAll}
        canModify={canModifySelected}
      />

      {/* Calendar Add/Edit Modal */}
      <CalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        calendarToEdit={calendarToEdit}
        currentUser={currentUser}
        onSaved={refreshAll}
        onDeleted={(deletedId) => {
          if (activeCalendarId === deletedId) {
            handleSelectCalendar(null);
          }
          refreshAll();
        }}
      />

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        calendar={activeCalendar}
        currentUser={currentUser}
        onChanged={loadCalendars}
      />

      {/* User Profile & Password Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(updatedUser) => {
          setCurrentUser(updatedUser);
          refreshAll();
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-slate-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      }
    >
      <CalendarApp />
    </Suspense>
  );
}
