"use client";

import React from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Settings,
  Users,
  CheckSquare,
  Sparkles,
  ChevronRight,
  FolderPlus,
  Bell,
  BellRing,
  Clock,
  LogOut,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDto, UserDto, EventDto } from "@/types";
import { calculateDDay } from "@/lib/holidays";
import { requestNotificationPermission, sendLocalNotification } from "@/lib/notifications";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  calendars: CalendarDto[];
  activeCalendar: CalendarDto | null;
  onSelectCalendar: (calendar: CalendarDto | null) => void;
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  onOpenNewCalendar: () => void;
  onOpenEditCalendar: (calendar: CalendarDto) => void;
  currentUser: UserDto | null;
  events?: EventDto[];
  onSelectEvent?: (event: EventDto) => void;
  onOpenProfile?: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  calendars,
  activeCalendar,
  onSelectCalendar,
  currentDate,
  onSelectDate,
  onOpenNewCalendar,
  onOpenEditCalendar,
  currentUser,
  events = [],
  onSelectEvent,
  onOpenProfile,
}: SidebarProps) {
  const [notificationEnabled, setNotificationEnabled] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationEnabled(Notification.permission === "granted");
    }
  }, []);

  const handleToggleNotification = async () => {
    const granted = await requestNotificationPermission();
    setNotificationEnabled(granted);
    if (granted) {
      sendLocalNotification("🔔 mytree 알림이 켜졌습니다!", {
        body: "새 일정이나 댓글이 등록되면 브라우저/스마트폰으로 알려드립니다.",
      });
    }
  };

  if (!isOpen) return null;

  // Mini Calendar logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Mini Calendar */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700">
            {format(currentDate, "yyyy년 M월", { locale: ko })}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 mb-1 font-semibold">
          <span className="text-red-400">일</span>
          <span>월</span>
          <span>화</span>
          <span>수</span>
          <span>목</span>
          <span>금</span>
          <span className="text-blue-400">토</span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {days.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, currentDate);

            return (
              <button
                key={idx}
                onClick={() => onSelectDate(day)}
                className={`h-6 w-6 mx-auto flex items-center justify-center rounded-full text-[11px] transition-colors ${
                  !isCurrentMonth ? "text-slate-300" : "text-slate-700"
                } ${
                  isToday ? "bg-emerald-500 text-white font-bold" : ""
                } ${
                  isSelected && !isToday ? "bg-slate-200 font-bold" : ""
                } hover:bg-slate-100`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendars Section */}
      <div className="p-3 flex-1">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            내 캘린더 목록
          </span>
          <button
            onClick={onOpenNewCalendar}
            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            title="캘린더 추가"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* All Calendars Option */}
        <button
          onClick={() => onSelectCalendar(null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium mb-1 transition-all ${
            activeCalendar === null
              ? "bg-slate-100 text-slate-900 font-bold"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>모든 캘린더 모아보기</span>
          </div>
        </button>

        {/* Calendar list */}
        <div className="space-y-1">
          {calendars.map((cal) => {
            const isSelected = activeCalendar?.id === cal.id;
            return (
              <div
                key={cal.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-emerald-50 text-emerald-900 font-bold border border-emerald-100"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <button
                  onClick={() => onSelectCalendar(cal)}
                  className="flex items-center space-x-2.5 truncate flex-1 text-left"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cal.color }}
                  />
                  <span className="truncate">{cal.name}</span>
                </button>

                <div className="flex items-center space-x-1 shrink-0 opacity-80 group-hover:opacity-100">
                  <div className="flex items-center text-[10px] text-slate-400 space-x-0.5 mr-1">
                    <Users className="w-3 h-3" />
                    <span>{cal.members?.length || 1}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEditCalendar(cal);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
                    title="캘린더 설정"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* D-Day 위젯 Section */}
        {events.length > 0 && (
          <div className="mt-5 pt-3 border-t border-slate-100 px-2">
            <div className="flex items-center space-x-1 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>다가오는 D-Day</span>
            </div>
            <div className="space-y-1.5">
              {events
                .filter((ev) => new Date(ev.startAt).getTime() >= new Date().setHours(0, 0, 0, 0))
                .slice(0, 3)
                .map((ev) => {
                  const dday = calculateDDay(new Date(ev.startAt));
                  const labelColor = ev.label?.colorHex || ev.calendar?.color || "#10B981";

                  return (
                    <div
                      key={ev.id}
                      onClick={() => onSelectEvent && onSelectEvent(ev)}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer text-xs transition-colors"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: labelColor }}
                        />
                        <span className="truncate font-medium text-slate-800">{ev.title}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 ${
                          dday.days === 0
                            ? "bg-rose-500 text-white animate-pulse"
                            : dday.days <= 3
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {dday.label}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Browser Notification Banner */}
        <div className="mt-4 px-2">
          <button
            onClick={handleToggleNotification}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
              notificationEnabled
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              {notificationEnabled ? (
                <BellRing className="w-4 h-4 text-emerald-600" />
              ) : (
                <Bell className="w-4 h-4 text-slate-400" />
              )}
              <span className="font-semibold text-[11px]">
                {notificationEnabled ? "스마트폰 알림 켜짐" : "알림 받기"}
              </span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                notificationEnabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {notificationEnabled ? "ON" : "설정"}
            </span>
          </button>
        </div>
      </div>

      {/* Footer Info & Logout */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onOpenProfile && onOpenProfile()}
          className="flex items-center space-x-2 px-1 py-1 min-w-0 text-left hover:bg-slate-100 rounded-xl transition-colors flex-1 mr-1"
          title="내 정보 변경"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white font-bold shrink-0 overflow-hidden"
            style={{ backgroundColor: currentUser?.color || "#10B981" }}
          >
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              currentUser?.name.charAt(0) || "U"
            )}
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-slate-800 truncate">{currentUser?.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
          </div>
        </button>

        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
          title="로그아웃"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
