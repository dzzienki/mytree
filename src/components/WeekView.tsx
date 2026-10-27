"use client";

import React from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  format,
  getHours,
  getMinutes,
} from "date-fns";
import { ko } from "date-fns/locale";
import { MessageSquare, MapPin } from "lucide-react";
import { EventDto } from "@/types";

interface WeekViewProps {
  currentDate: Date;
  events: EventDto[];
  onSelectEvent: (event: EventDto) => void;
  onAddEventOnDate: (date: Date) => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
}

export default function WeekView({
  currentDate,
  events,
  onSelectEvent,
  onAddEventOnDate,
  onPrevWeek,
  onNextWeek,
}: WeekViewProps) {
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Detect horizontal swipe (distance > 50px, horizontal dominant)
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX > 0 && onPrevWeek) {
        onPrevWeek();
      } else if (diffX < 0 && onNextWeek) {
        onNextWeek();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Filter all day vs timed events
  const getEventsForDay = (day: Date) => {
    return events.filter((ev) => {
      const evStart = new Date(ev.startAt);
      return isSameDay(evStart, day);
    });
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex flex-col h-full bg-white overflow-y-auto"
    >
      {/* Week Header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50 sticky top-0 z-20 shadow-xs">
        <div className="p-2 border-r border-slate-200 text-center text-xs font-semibold text-slate-400">
          시간
        </div>
        {days.map((day, i) => {
          const isToday = isSameDay(day, new Date());
          const isSunday = day.getDay() === 0;
          const isSaturday = day.getDay() === 6;

          return (
            <div
              key={i}
              className={`p-2 text-center border-r border-slate-200 last:border-r-0 ${
                isToday ? "bg-emerald-50/50" : ""
              }`}
            >
              <div
                className={`text-xs font-semibold ${
                  isSunday ? "text-rose-500" : isSaturday ? "text-sky-500" : "text-slate-500"
                }`}
              >
                {format(day, "E", { locale: ko })}
              </div>
              <div
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mt-0.5 ${
                  isToday ? "bg-emerald-500 text-white shadow-xs" : "text-slate-800"
                }`}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hourly Grid */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] flex-1 relative divide-x divide-slate-100">
        {/* Time column */}
        <div className="divide-y divide-slate-100 bg-slate-50/50">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-14 pr-2 text-right text-[11px] font-medium text-slate-400 flex items-start justify-end pt-1"
            >
              {hour.toString().padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* 7 Days Columns */}
        {days.map((day, dayIdx) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dayIdx}
              className={`relative divide-y divide-slate-100 ${isToday ? "bg-emerald-50/10" : ""}`}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  onClick={() => {
                    const target = new Date(day);
                    target.setHours(hour, 0, 0, 0);
                    onAddEventOnDate(target);
                  }}
                  className="h-14 hover:bg-emerald-50/30 cursor-pointer transition-colors"
                />
              ))}

              {/* Event Cards Absolute Overlays */}
              {dayEvents.map((ev) => {
                const start = new Date(ev.startAt);
                const end = new Date(ev.endAt);
                const startHour = getHours(start) + getMinutes(start) / 60;
                const endHour = Math.max(startHour + 0.5, getHours(end) + getMinutes(end) / 60);
                const durationHours = endHour - startHour;

                const topPx = startHour * 56; // 56px per hour
                const heightPx = Math.max(28, durationHours * 56);
                const labelColor = ev.label?.colorHex || ev.calendar?.color || "#10B981";

                return (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(ev);
                    }}
                    style={{
                      top: `${topPx}px`,
                      height: `${heightPx}px`,
                      backgroundColor: `${labelColor}22`,
                      borderLeft: `4px solid ${labelColor}`,
                    }}
                    className="absolute left-1 right-1 rounded-md p-1.5 shadow-xs overflow-hidden cursor-pointer hover:shadow-md transition-all z-10"
                  >
                    <div className="flex items-center justify-between text-xs font-bold truncate" style={{ color: labelColor }}>
                      <span className="truncate">{ev.title}</span>
                      {ev._count?.comments ? (
                        <div className="flex items-center text-[10px] space-x-0.5 ml-1">
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>{ev._count.comments}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {format(start, "HH:mm")} - {format(end, "HH:mm")}
                    </div>
                    {ev.location && (
                      <div className="flex items-center text-[10px] text-slate-400 space-x-1 mt-0.5 truncate">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
