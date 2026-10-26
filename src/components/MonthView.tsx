"use client";

import React from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { ko } from "date-fns/locale";
import { MessageSquare, Clock, MapPin, Image as ImageIcon } from "lucide-react";
import { EventDto } from "@/types";
import { getHoliday } from "@/lib/holidays";

interface MonthViewProps {
  currentDate: Date;
  events: EventDto[];
  onSelectEvent: (event: EventDto) => void;
  onSelectDate: (date: Date) => void;
  onAddEventOnDate: (date: Date) => void;
}

export default function MonthView({
  currentDate,
  events,
  onSelectEvent,
  onSelectDate,
  onAddEventOnDate,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  // Helper to find events occurring on a specific date
  const getEventsForDay = (day: Date) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);

    return events.filter((ev) => {
      const evStart = new Date(ev.startAt);
      const evEnd = new Date(ev.endAt);

      return (
        isSameDay(evStart, day) ||
        isSameDay(evEnd, day) ||
        (evStart < dayStart && evEnd > dayEnd)
      );
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      {/* Day of Week Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center py-2 text-xs font-semibold text-slate-500">
        {dayNames.map((name, i) => (
          <div
            key={name}
            className={`${i === 0 ? "text-rose-500" : i === 6 ? "text-sky-500" : "text-slate-600"}`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-slate-100 border-b border-slate-200">
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, currentDate);
          const dayEvents = getEventsForDay(day);
          const isSunday = day.getDay() === 0;
          const isSaturday = day.getDay() === 6;
          const holiday = getHoliday(day);
          const isRedDay = isSunday || !!holiday?.isHoliday;

          return (
            <div
              key={idx}
              onClick={() => onSelectDate(day)}
              onDoubleClick={() => onAddEventOnDate(day)}
              className={`min-h-[105px] p-1.5 flex flex-col transition-colors group relative cursor-pointer ${
                !isCurrentMonth ? "bg-slate-50/40 text-slate-400" : "bg-white text-slate-800"
              } ${isSelected ? "bg-emerald-50/20" : ""} hover:bg-slate-50/80`}
            >
              {/* Day Header (Number, Holiday Name & Quick Add Button) */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1 truncate">
                  <div
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium transition-all ${
                      isToday
                        ? "bg-emerald-500 text-white font-bold shadow-xs"
                        : isRedDay
                        ? "text-rose-500 font-semibold"
                        : isSaturday
                        ? "text-sky-500 font-semibold"
                        : !isCurrentMonth
                        ? "text-slate-300"
                        : "text-slate-700"
                    }`}
                  >
                    {format(day, "d")}
                  </div>

                  {holiday && isCurrentMonth && (
                    <span className="text-[10px] text-rose-500 font-medium truncate max-w-[65px] hidden sm:inline">
                      {holiday.name}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddEventOnDate(day);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[10px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold transition-opacity"
                  title="일정 추가"
                >
                  +
                </button>
              </div>

              {/* Day Events Stack */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => {
                  const labelColor = ev.label?.colorHex || ev.calendar?.color || "#10B981";
                  const commentCount = ev._count?.comments || ev.comments?.length || 0;

                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className="group/item flex items-center justify-between px-1.5 py-0.5 rounded text-[11px] font-medium transition-all hover:scale-[1.01] hover:shadow-xs cursor-pointer truncate"
                      style={{
                        backgroundColor: ev.isAllDay ? labelColor : `${labelColor}18`,
                        color: ev.isAllDay ? "#ffffff" : labelColor,
                        borderLeft: ev.isAllDay ? "none" : `3px solid ${labelColor}`,
                      }}
                    >
                      <div className="flex items-center space-x-1 truncate">
                        {!ev.isAllDay && (
                          <span className="text-[10px] opacity-80 shrink-0 font-semibold">
                            {format(new Date(ev.startAt), "HH:mm")}
                          </span>
                        )}
                        <span className="truncate">{ev.title}</span>
                      </div>

                      {/* Attachments & Comments badges */}
                      <div className="flex items-center space-x-0.5 shrink-0 ml-1">
                        {ev.attachments && ev.attachments.length > 0 && (
                          <div
                            className={`flex items-center text-[9px] px-0.5 rounded-full ${
                              ev.isAllDay ? "bg-black/20 text-white" : "bg-white/80 text-slate-700"
                            }`}
                            title={`사진 ${ev.attachments.length}장 첨부됨`}
                          >
                            <ImageIcon className="w-2.5 h-2.5" />
                          </div>
                        )}

                        {commentCount > 0 && (
                          <div
                            className={`flex items-center space-x-0.5 text-[9px] px-1 rounded-full ${
                              ev.isAllDay ? "bg-black/20 text-white" : "bg-white/80 text-slate-700"
                            }`}
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>{commentCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* More events indicator */}
                {dayEvents.length > 3 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(day);
                    }}
                    className="text-[10px] text-slate-500 font-semibold pl-1 hover:text-emerald-600 transition-colors"
                  >
                    +{dayEvents.length - 3}개 더보기
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
