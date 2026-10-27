"use client";

import { apiFetch, withBase } from "@/lib/base-path";
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
import { format, startOfWeek, endOfWeek } from "date-fns";
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

  // Helper to format date label based on current active tab
  const getFormattedDateLabel = () => {
    if (activeTab === "month") {
      return format(currentDate, "yyyy년 M월", { locale: ko });
    }

    if (activeTab === "week") {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      const startYear = format(weekStart, "yyyy");
      const endYear = format(weekEnd, "yyyy");
      const startMonth = format(weekStart, "M");
      const endMonth = format(weekEnd, "M");

      if (startYear === endYear && startMonth === endMonth) {
        return `${format(weekStart, "yyyy년 M월")} ${format(weekStart, "d일")} ~ ${format(weekEnd, "d일")}`;
      } else if (startYear === endYear) {
        return `${format(weekStart, "M월 d일")} ~ ${format(weekEnd, "M월 d일")} (${startYear}년)`;
      } else {
        return `${format(weekStart, "yyyy.M.d")} ~ ${format(weekEnd, "yyyy.M.d")}`;
      }
    }

    if (activeTab === "list") {
      return format(currentDate, "yyyy년 M월 일정", { locale: ko });
    }

    if (activeTab === "keep") {
      return "Keep 메모 & 할일";
    }

    return "최근 활동 피드";
  };

  const isDateNavigable = activeTab === "month" || activeTab === "week" || activeTab === "list";

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs select-none">
      {/* =========================================================================
          1. DESKTOP HEADER (Visible on md: and larger screens)
         ========================================================================= */}
      <div className="hidden md:flex items-center justify-between px-4 h-16">
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
              <span className="max-w-[150px] lg:max-w-[200px] truncate">
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

        {/* Center: Date navigation (Month / Week / List Range) */}
        <div className="flex items-center space-x-2">
          {isDateNavigable && (
            <>
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
            </>
          )}

          <span className="text-base lg:text-lg font-bold text-slate-800 min-w-[130px] text-center ml-1">
            {getFormattedDateLabel()}
          </span>
        </div>

        {/* Right: View tabs & Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Tab buttons */}
          <nav className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
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
              <span>초대</span>
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
                  <img src={withBase(currentUser.avatarUrl)} alt={currentUser.name} className="w-full h-full object-cover" />
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
                <div className="px-4 py-3 border-b border-slate-100 flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xs overflow-hidden shrink-0"
                    style={{ backgroundColor: currentUser?.color || "#10B981" }}
                  >
                    {currentUser?.avatarUrl ? (
                      <img src={withBase(currentUser.avatarUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      currentUser?.name.charAt(0) || "U"
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
                  </div>
                </div>

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
                      await apiFetch("/api/auth/logout", { method: "POST" });
                      window.location.href = withBase("/login");
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

      {/* =========================================================================
          2. MOBILE APP HEADER (Clean, dedicated TimeTree-style 3-row layout)
         ========================================================================= */}
      <div className="md:hidden flex flex-col">
        {/* Tier 1: Mobile App Top Bar */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-slate-100 bg-white">
          {/* Left: Hamburger menu + Calendar pill selector */}
          <div className="flex items-center space-x-2 min-w-0">
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
              title="메뉴 열기"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Calendar Selector Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setIsCalDropdownOpen(!isCalDropdownOpen)}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 transition-all text-left"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeCalendar ? activeCalendar.color : "#6366F1" }}
                />
                <span className="text-xs font-bold text-slate-800 max-w-[110px] sm:max-w-[150px] truncate">
                  {activeCalendar ? activeCalendar.name : "모든 캘린더"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isCalDropdownOpen && (
                <div
                  className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setIsCalDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    캘린더 선택
                  </div>
                  <button
                    onClick={() => onSelectCalendar(null)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 ${
                      activeCalendar === null ? "text-emerald-600 font-bold bg-emerald-50/50" : "text-slate-700"
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
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 ${
                        activeCalendar?.id === cal.id ? "text-emerald-600 font-bold bg-emerald-50/50" : "text-slate-700"
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
                    className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-emerald-600 hover:bg-emerald-50 text-left font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>새 캘린더 만들기</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick actions: [오늘], [+ 일정], [프로필 아바타] */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Quick Today Jump */}
            <button
              onClick={onToday}
              className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 rounded-full border border-emerald-200/80 transition-all"
              title="오늘 날짜로 이동"
            >
              오늘
            </button>

            {/* Quick Add Event */}
            <button
              onClick={onOpenNewEvent}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>일정</span>
            </button>

            {/* Profile Avatar */}
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center justify-center p-0.5 rounded-full hover:ring-2 hover:ring-emerald-500/20 active:scale-95 transition-all"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs overflow-hidden"
                  style={{ backgroundColor: currentUser?.color || "#10B981" }}
                >
                  {currentUser?.avatarUrl ? (
                    <img src={withBase(currentUser.avatarUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    currentUser?.name.charAt(0) || "U"
                  )}
                </div>
              </button>

              {isUserDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setIsUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center space-x-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                      style={{ backgroundColor: currentUser?.color || "#10B981" }}
                    >
                      {currentUser?.avatarUrl ? (
                        <img src={withBase(currentUser.avatarUrl)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        currentUser?.name.charAt(0) || "U"
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
                    </div>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      onClick={() => onOpenProfile()}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-700 rounded-xl transition-colors font-medium text-left"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>회원정보 및 비밀번호 변경</span>
                    </button>

                    {activeCalendar && (
                      <button
                        onClick={onOpenInvite}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors font-medium text-left"
                      >
                        <Share2 className="w-4 h-4 text-emerald-600" />
                        <span>캘린더 멤버 초대</span>
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        await apiFetch("/api/auth/logout", { method: "POST" });
                        window.location.href = withBase("/login");
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-semibold text-left"
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

        {/* Tier 2: Dedicated Date Navigation Subheader (Solves missing date and ugly squeezed navigation buttons) */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50/70 border-b border-slate-200/80">
          {/* Prominent Current Date & View Title */}
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
              {getFormattedDateLabel()}
            </span>
          </div>

          {/* TimeTree-style Navigation Control Capsule */}
          {isDateNavigable && (
            <div className="flex items-center space-x-1 bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs shrink-0 ml-2">
              <button
                onClick={onPrev}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 active:bg-slate-100 transition-all"
                title={activeTab === "week" ? "이전 주" : "이전 달"}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-[10px] font-bold text-slate-400 px-1 select-none">
                {activeTab === "week" ? "주" : "월"}
              </span>

              <button
                onClick={onNext}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 active:bg-slate-100 transition-all"
                title={activeTab === "week" ? "다음 주" : "다음 달"}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Tier 3: Mobile View Tabs (월간 · 주간 · 목록 · Keep · 피드) */}
        <div className="flex border-b border-slate-200 px-2 py-1.5 bg-white justify-around shadow-2xs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all text-center ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
