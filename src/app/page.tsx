"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
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

  // Navigation & State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<"month" | "week" | "list" | "keep" | "feed">("month");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Data
  const [users, setUsers] = useState<UserDto[]>([]);
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [calendars, setCalendars] = useState<CalendarDto[]>([]);
  const [activeCalendar, setActiveCalendar] = useState<CalendarDto | null>(null);
  const [events, setEvents] = useState<EventDto[]>([]);
  const [keepItems, setKeepItems] = useState<KeepItemDto[]>([]);
  const [activities, setActivities] = useState<ActivityLogDto[]>([]);
  const [authChecking, setAuthChecking] = useState(true);

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventDto | null>(null);
  const [initialDateForModal, setInitialDateForModal] = useState<Date>(new Date());
  const [initialTitleForModal, setInitialTitleForModal] = useState("");
  const [initialDescForModal, setInitialDescForModal] = useState("");

  const [selectedEvent, setSelectedEvent] = useState<EventDto | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarToEdit, setCalendarToEdit] = useState<CalendarDto | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // 1. Initial Load: Check Auth Session
  useEffect(() => {
    async function checkAuthAndInit() {
      try {
        const authRes = await fetch("/api/auth/me");
        const authData = await authRes.json();

        if (!authData.user) {
          router.push("/login");
          return;
        }

        setCurrentUser(authData.user);

        // Fetch other users for team member assignments
        const usersRes = await fetch("/api/users");
        if (usersRes.ok) {
          const uData: UserDto[] = await usersRes.json();
          setUsers(uData);
        }
      } catch (e) {
        console.error("Auth check failed:", e);
        router.push("/login");
      } finally {
        setAuthChecking(false);
      }
    }

    checkAuthAndInit();

    // Register PWA Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, [router]);

  // 2. Load Calendars when currentUser is set
  const loadCalendars = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/calendars?userId=${currentUser.id}`);
      if (res.ok) {
        const data: CalendarDto[] = await res.json();
        setCalendars(data);
        if (!activeCalendar && data.length > 0) {
          setActiveCalendar(data[0]);
        } else if (activeCalendar) {
          const updated = data.find((c) => c.id === activeCalendar.id);
          if (updated) setActiveCalendar(updated);
        }
      }
    } catch (e) {
      console.error("Failed to load calendars:", e);
    }
  }, [currentUser, activeCalendar]);

  useEffect(() => {
    loadCalendars();
  }, [loadCalendars]);

  // 3. Load Events
  const loadEvents = useCallback(async () => {
    try {
      const calParam = activeCalendar ? activeCalendar.id : "all";
      const userParam = currentUser ? currentUser.id : "";
      const res = await fetch(`/api/events?calendarId=${calParam}&userId=${userParam}`);
      if (res.ok) {
        const data: EventDto[] = await res.json();
        setEvents(data);

        if (selectedEvent) {
          const fresh = data.find((e) => e.id === selectedEvent.id);
          if (fresh) setSelectedEvent(fresh);
        }
      }
    } catch (e) {
      console.error("Failed to load events:", e);
    }
  }, [activeCalendar, currentUser, selectedEvent]);

  // 4. Load Keep Items
  const loadKeepItems = useCallback(async () => {
    try {
      const calParam = activeCalendar ? activeCalendar.id : "all";
      const res = await fetch(`/api/keep?calendarId=${calParam}`);
      if (res.ok) {
        const data: KeepItemDto[] = await res.json();
        setKeepItems(data);
      }
    } catch (e) {
      console.error("Failed to load keep items:", e);
    }
  }, [activeCalendar]);

  // 5. Load Activity Logs
  const loadActivities = useCallback(async () => {
    try {
      const calParam = activeCalendar ? activeCalendar.id : "all";
      const userParam = currentUser ? currentUser.id : "";
      const res = await fetch(`/api/activities?calendarId=${calParam}&userId=${userParam}`);
      if (res.ok) {
        const data: ActivityLogDto[] = await res.json();
        setActivities(data);
      }
    } catch (e) {
      console.error("Failed to load activities:", e);
    }
  }, [activeCalendar, currentUser]);

  useEffect(() => {
    loadEvents();
    loadKeepItems();
    loadActivities();
  }, [loadEvents, loadKeepItems, loadActivities]);

  // Date Navigation
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
    loadCalendars();
    loadEvents();
    loadKeepItems();
    loadActivities();
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
      <Header
        activeCalendar={activeCalendar}
        calendars={calendars}
        onSelectCalendar={(cal) => setActiveCalendar(cal)}
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
          refreshAll();
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

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          calendars={calendars}
          activeCalendar={activeCalendar}
          onSelectCalendar={(cal) => setActiveCalendar(cal)}
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
              onRefresh={loadKeepItems}
              onConvertToEvent={handleConvertToEvent}
            />
          )}

          {activeTab === "feed" && (
            <FeedView
              activities={activities}
              onRefresh={loadActivities}
            />
          )}
        </main>
      </div>

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
      />

      <CalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        calendarToEdit={calendarToEdit}
        currentUser={currentUser}
        onSaved={refreshAll}
        onDeleted={(deletedId) => {
          if (activeCalendar?.id === deletedId) {
            setActiveCalendar(null);
          }
          refreshAll();
        }}
      />

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
