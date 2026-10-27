"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { EventDto } from "@/types";
import { sendLocalNotification } from "@/lib/notifications";

/**
 * Event Reminder Scheduler:
 * Checks upcoming events every 30 seconds and triggers browser/device notifications
 * when an event start time arrives (at exact start time, or 10 minutes prior).
 */
export function useEventReminders(events: EventDto[]) {
  const notifiedKeysRef = useRef<Set<string>>(new Set());

  // Load previously notified keys from sessionStorage to prevent duplicate alarms on refresh
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("mytree_notified_alarms");
        if (saved) {
          const arr: string[] = JSON.parse(saved);
          notifiedKeysRef.current = new Set(arr);
        }
      } catch (e) {}
    }
  }, []);

  const markNotified = (key: string) => {
    notifiedKeysRef.current.add(key);
    if (typeof window !== "undefined") {
      try {
        const arr = Array.from(notifiedKeysRef.current);
        sessionStorage.setItem("mytree_notified_alarms", JSON.stringify(arr));
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const checkReminders = () => {
      const now = Date.now();

      events.forEach((ev) => {
        const start = new Date(ev.startAt).getTime();
        const calName = ev.calendar?.name || "mytree";

        // 1. Time-specific events (not all-day)
        if (!ev.isAllDay) {
          // Exact time alert (within 60 seconds of startAt)
          const exactKey = `${ev.id}_exact_${start}`;
          if (!notifiedKeysRef.current.has(exactKey)) {
            // Trigger if within -30s to +60s of start time
            if (now >= start - 30 * 1000 && now <= start + 60 * 1000) {
              markNotified(exactKey);
              sendLocalNotification(`🔔 [일정 시작] ${ev.title}`, {
                body: `${format(new Date(ev.startAt), "a h:mm", { locale: ko })}에 시작하는 일정입니다. (${calName})`,
                tag: exactKey,
              });
            }
          }

          // 10-minutes prior alert
          const tenMinKey = `${ev.id}_10m_${start}`;
          const tenMinBefore = start - 10 * 60 * 1000;
          if (!notifiedKeysRef.current.has(tenMinKey)) {
            if (now >= tenMinBefore - 30 * 1000 && now <= tenMinBefore + 60 * 1000) {
              markNotified(tenMinKey);
              sendLocalNotification(`⏰ [10분 전] ${ev.title}`, {
                body: `10분 뒤(${format(new Date(ev.startAt), "a h:mm", { locale: ko })}) 일정이 시작됩니다. (${calName})`,
                tag: tenMinKey,
              });
            }
          }
        } else {
          // 2. All-day events: trigger morning reminder around 09:00 AM on that day
          const todayDateStr = format(new Date(), "yyyy-MM-dd");
          const evDateStr = format(new Date(ev.startAt), "yyyy-MM-dd");
          const allDayKey = `${ev.id}_allday_${todayDateStr}`;

          if (todayDateStr === evDateStr && !notifiedKeysRef.current.has(allDayKey)) {
            const currentHour = new Date().getHours();
            // Trigger if it's 9 AM or later
            if (currentHour >= 9) {
              markNotified(allDayKey);
              sendLocalNotification(`📅 [오늘의 종일 일정] ${ev.title}`, {
                body: `오늘 예정된 종일 일정입니다. (${calName})`,
                tag: allDayKey,
              });
            }
          }
        }
      });
    };

    // Run check immediately, then every 30 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 30 * 1000);

    return () => clearInterval(interval);
  }, [events]);
}
