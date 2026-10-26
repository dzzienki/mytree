"use client";

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Share2,
  Users,
  Menu,
  ChevronDown,
  Sparkles,
  Check,
  LogOut,
  User as UserIcon,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDto, UserDto } from "@/types";

interface HeaderProps {
  activeCalendar: CalendarDto | null;
  calendars: CalendarDto[];
  onSelectCalendar: (calendar: CalendarDto | null) => void;
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  activeTab: "month" | "week" | "list" | "keep" | "feed";
  onSelectTab: (tab: "month" | "week" | "list" | "keep" | "feed") => void;
  currentUser: UserDto | null;
  onOpenProfile: () => void;
  onOpenNewEvent: () => void;
  onOpenInvite: () => void;
  onOpenNewCalendar: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Header({
  activeCalendar,
  calendars,
  onSelectCalendar,
  currentDate,
  onPrev,
  onNext,
  onToday,
  activeTab,
  onSelectTab,
  currentUser,
  onOpenProfile,
  onOpenNewEvent,
  onOpenInvite,
  onOpenNewCalendar,
  isSidebarOpen,
  onToggleSidebar,
}: HeaderProps) {
  const [isCalDropdownOpen, setIsCalDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const tabs: { id: "month" | "week" | "list" | "keep" | "feed"; label: string }[] = [
    { id: "month", label: "월간" },
    { id: "week", label: "주간" },
    { id: "list", label: "목록" },
    { id: "keep", label: "Keep" },
    { id: "feed", label: "피드" },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="flex items-center justify-between px-4 h-16">
        {/* Left: Sidebar toggle, App logo, Calendar selector */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="사이드바 토글"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <div className="flex items-center space-x-2 mr-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold shadow-xs">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 hidden sm:inline-block">
              mytree
            </span>
          </div>

          {/* Calendar Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCalDropdownOpen(!isCalDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 font-medium text-sm transition-all"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: activeCalendar ? activeCalendar.color : "#6366F1" }}
              />
              <span className="max-w-[130px] sm:max-w-[200px] truncate">
                {activeCalendar ? activeCalendar.name : "모든 캘린더 모아보기"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isCalDropdownOpen && (
              <div
                className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onClick={() => setIsCalDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  캘린더 선택
                </div>
                <button
                  onClick={() => onSelectCalendar(null)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 ${
                    activeCalendar === null ? "text-emerald-600 font-semibold bg-emerald-50/50" : "text-slate-700"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span>모든 캘린더 모아보기</span>
                  </div>
                  {activeCalendar === null && <Check className="w-4 h-4 text-emerald-600" />}
                </button>

                <div className="h-px bg-slate-100 my-1" />

                {calendars.map((cal) => (
                  <button
                    key={cal.id}
                    onClick={() => onSelectCalendar(cal)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 ${
                      activeCalendar?.id === cal.id ? "text-emerald-600 font-semibold bg-emerald-50/50" : "text-slate-700"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cal.color }} />
                      <span className="truncate">{cal.name}</span>
                    </div>
                    {activeCalendar?.id === cal.id && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                ))}

                <div className="h-px bg-slate-100 my-1" />
                <button
                  onClick={onOpenNewCalendar}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 text-left font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>새 캘린더 만들기</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center: Date navigation (Month / Year) */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={onPrev}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="이전"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={onToday}
            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            오늘
          </button>

          <button
            onClick={onNext}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="다음"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <span className="text-base sm:text-lg font-bold text-slate-800 min-w-[110px] text-center ml-1">
            {format(currentDate, "yyyy년 M월", { locale: ko })}
          </span>
        </div>

        {/* Right: View tabs & Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Tab buttons */}
          <nav className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Invite button */}
          {activeCalendar && (
            <button
              onClick={onOpenInvite}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200"
              title="멤버 초대 및 링크"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">초대</span>
            </button>
          )}

          {/* Add Event Button */}
          <button
            onClick={onOpenNewEvent}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>일정 추가</span>
          </button>

          {/* Current User Profile Avatar & Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center space-x-1 p-1 rounded-full hover:ring-2 hover:ring-emerald-500/20 transition-all cursor-pointer"
              title="내 프로필 및 설정"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs overflow-hidden"
                style={{ backgroundColor: currentUser?.color || "#10B981" }}
              >
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name.charAt(0) || "U"
                )}
              </div>
            </button>

            {isUserDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onClick={() => setIsUserDropdownOpen(false)}
              >
                {/* User Info Header Card */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xs overflow-hidden shrink-0"
                    style={{ backgroundColor: currentUser?.color || "#10B981" }}
                  >
                    {currentUser?.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      currentUser?.name.charAt(0) || "U"
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
                  </div>
                </div>

                {/* Menu items */}
                <div className="p-1 space-y-0.5">
                  <button
                    onClick={() => onOpenProfile()}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-700 rounded-xl transition-colors font-medium text-left"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>회원정보 및 비밀번호 변경</span>
                  </button>

                  <button
                    onClick={async () => {
                      await fetch("/api/auth/logout", { method: "POST" });
                      window.location.href = "/login";
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-semibold text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>로그아웃</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="flex md:hidden border-t border-slate-100 px-2 py-1 bg-slate-50 justify-around">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeTab === tab.id
                ? "bg-white text-emerald-700 font-bold shadow-xs border border-slate-200"
                : "text-slate-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
}
