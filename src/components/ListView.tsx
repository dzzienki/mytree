"use client";

import React from "react";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { ko } from "date-fns/locale";
import { Clock, MapPin, MessageSquare, Users, Calendar } from "lucide-react";
import { EventDto } from "@/types";

interface ListViewProps {
  events: EventDto[];
  onSelectEvent: (event: EventDto) => void;
  onOpenNewEvent: () => void;
}

export default function ListView({
  events,
  onSelectEvent,
  onOpenNewEvent,
}: ListViewProps) {
  // Group events by date string (YYYY-MM-DD)
  const grouped = events.reduce((acc, ev) => {
    const key = format(new Date(ev.startAt), "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {} as Record<string, EventDto[]>);

  const sortedDates = Object.keys(grouped).sort();

  const getDateHeader = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "오늘 (" + format(d, "M월 d일 EEEE", { locale: ko }) + ")";
    if (isTomorrow(d)) return "내일 (" + format(d, "M월 d일 EEEE", { locale: ko }) + ")";
    if (isYesterday(d)) return "어제 (" + format(d, "M월 d일 EEEE", { locale: ko }) + ")";
    return format(d, "yyyy년 M월 d일 (EEEE)", { locale: ko });
  };

  if (events.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">등록된 일정이 없습니다</h3>
        <p className="text-xs text-slate-500 mb-4 max-w-xs">
          가족, 친구들과 공유할 새로운 일정을 등록해 보세요!
        </p>
        <button
          onClick={onOpenNewEvent}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
        >
          + 새 일정 등록하기
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {sortedDates.map((dateStr) => {
          const dayEvents = grouped[dateStr];
          const isDateToday = isToday(new Date(dateStr));

          return (
            <div key={dateStr} className="space-y-2">
              <div className="flex items-center space-x-2">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                    isDateToday
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {getDateHeader(dateStr)}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {dayEvents.length}개의 일정
                </span>
              </div>

              <div className="space-y-2">
                {dayEvents.map((ev) => {
                  const labelColor = ev.label?.colorHex || ev.calendar?.color || "#10B981";
                  const commentCount = ev._count?.comments || ev.comments?.length || 0;

                  return (
                    <div
                      key={ev.id}
                      onClick={() => onSelectEvent(ev)}
                      className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-start justify-between group"
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className="w-2 h-10 rounded-full mt-0.5 shrink-0"
                          style={{ backgroundColor: labelColor }}
                        />

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {ev.title}
                            </span>
                            {ev.label && (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                style={{
                                  backgroundColor: `${labelColor}20`,
                                  color: labelColor,
                                }}
                              >
                                {ev.label.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-3 text-xs text-slate-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {ev.isAllDay
                                  ? "종일"
                                  : `${format(new Date(ev.startAt), "HH:mm")} - ${format(
                                      new Date(ev.endAt),
                                      "HH:mm"
                                    )}`}
                              </span>
                            </div>

                            {ev.location && (
                              <div className="flex items-center space-x-1 text-slate-500">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span className="truncate max-w-[150px]">{ev.location}</span>
                              </div>
                            )}
                          </div>

                          {ev.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right metadata (comments, participants) */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {commentCount > 0 && (
                          <div className="flex items-center space-x-1 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="font-semibold">{commentCount}</span>
                          </div>
                        )}

                        {ev.participants && ev.participants.length > 0 && (
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {ev.participants.map((p) => (
                              <div
                                key={p.id}
                                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold"
                                style={{ backgroundColor: p.user.color || "#10B981" }}
                                title={p.user.name}
                              >
                                {p.user.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
