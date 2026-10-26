"use client";

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
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { CalendarDto, EventDto, KeepItemDto, ActivityLogDto, UserDto } from "@/types";

function CalendarApp() {
  const router = useRouter();

  // Navigation & View State
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [activeTab, setActiveTab] = useState<"month" | "week" | "list" | "keep" | "feed">("month");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auth & User State
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [users, setUsers] = useState<UserDto[]>([]);
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

  // Derived active calendar object (NO state loop!)
  const activeCalendar = useMemo(() => {
    if (!activeCalendarId) return null;
    return calendars.find((c) => c.id === activeCalendarId) || null;
  }, [calendars, activeCalendarId]);

  // 1. Initial Load: Auth check and users fetch (Runs ONCE on mount)
  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndInit() {
      try {
        const authRes = await fetch("/api/auth/me");
        const authData = await authRes.json();

        if (!authData.user) {
          router.push("/login");
          return;
        }

        if (isMounted) {
          setCurrentUser(authData.user);

          // Fetch other users for team member assignments
          const usersRes = await fetch("/api/users");
          if (usersRes.ok) {
            const uData: UserDto[] = await usersRes.json();
            setUsers(uData);
          }
        }
      } catch (e) {
        console.error("Auth check failed:", e);
        router.push("/login");
      } finally {
        if (isMounted) setAuthChecking(false);
      }
    }

    checkAuthAndInit();

    // Register PWA Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [router]);

  // 2. Load Calendars when currentUser is determined
  const loadCalendars = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/calendars?userId=${userId}`);
      if (res.ok) {
        const data: CalendarDto[] = await res.json();
        setCalendars(data);
        setActiveCalendarId((prevId) => {
          if (prevId && data.some((c) => c.id === prevId)) return prevId;
          return data[0]?.id || null;
        });
      }
    } catch (e) {
      console.error("Failed to load calendars:", e);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      loadCalendars(currentUser.id);
    }
  }, [currentUser?.id, loadCalendars]);

  // 3. Load Events, Keep, and Activities in parallel (Only when activeCalendarId or user changes)
  const loadCalendarData = useCallback(async (calId: string | null, userId: string) => {
    try {
      const calParam = calId || "all";
      const [eventsRes, keepRes, actRes] = await Promise.all([
        fetch(`/api/events?calendarId=${calParam}&userId=${userId}`),
        fetch(`/api/keep?calendarId=${calParam}`),
        fetch(`/api/activities?calendarId=${calParam}&userId=${userId}`),
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
      loadCalendarData(activeCalendarId, currentUser.id);
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
    if (activeTab === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (activeTab === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 7));
  };

  const handleNext = () => {
    if (activeTab === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (activeTab === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 7));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
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
      loadCalendars(currentUser.id);
      loadCalendarData(activeCalendarId, currentUser.id);
    }
  };

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
        onSelectCalendar={(cal) => setActiveCalendarId(cal?.id || null)}
        currentDate={currentDate}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        currentUser={currentUser}
        users={users}
        onSelectUser={(u) => {
          setCurrentUser(u);
        }}
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
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          calendars={calendars}
          activeCalendar={activeCalendar}
          onSelectCalendar={(cal) => setActiveCalendarId(cal?.id || null)}
          currentDate={currentDate}
          onSelectDate={(d) => setCurrentDate(d)}
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
        />

        {/* View Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {activeTab === "month" && (
            <MonthView
              currentDate={currentDate}
              events={events}
              onSelectEvent={handleSelectEvent}
              onSelectDate={(d) => setCurrentDate(d)}
              onAddEventOnDate={(d) => handleOpenNewEvent(d)}
            />
          )}

          {activeTab === "week" && (
            <WeekView
              currentDate={currentDate}
              events={events}
              onSelectEvent={handleSelectEvent}
              onAddEventOnDate={(d) => handleOpenNewEvent(d)}
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
              currentUser={currentUser}
              onRefresh={() => currentUser?.id && loadCalendarData(activeCalendarId, currentUser.id)}
              onConvertToEvent={handleConvertToEvent}
            />
          )}

          {activeTab === "feed" && (
            <FeedView
              activities={activities}
              onRefresh={() => currentUser?.id && loadCalendarData(activeCalendarId, currentUser.id)}
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
            setActiveCalendarId(null);
          }
          refreshAll();
        }}
      />

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        calendar={activeCalendar}
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
