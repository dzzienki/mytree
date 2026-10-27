"use client";

import { withBase } from "@/lib/base-path";
import React from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CalendarPlus,
  Edit,
  Trash2,
  MessageSquare,
  Bookmark,
  Bell,
  Clock,
} from "lucide-react";
import { ActivityLogDto } from "@/types";

interface FeedViewProps {
  activities: ActivityLogDto[];
  onRefresh: () => void;
}

export default function FeedView({ activities, onRefresh }: FeedViewProps) {
  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATED_EVENT":
        return {
          icon: <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />,
          label: "새 일정 등록",
          bgColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "UPDATED_EVENT":
        return {
          icon: <Edit className="w-3.5 h-3.5 text-sky-600" />,
          label: "일정 수정",
          bgColor: "bg-sky-50 text-sky-700 border-sky-200",
        };
      case "DELETED_EVENT":
        return {
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
          label: "일정 삭제",
          bgColor: "bg-rose-50 text-rose-700 border-rose-200",
        };
      case "COMMENTED":
        return {
          icon: <MessageSquare className="w-3.5 h-3.5 text-amber-600" />,
          label: "댓글 작성",
          bgColor: "bg-amber-50 text-amber-700 border-amber-200",
        };
      case "CREATED_KEEP":
        return {
          icon: <Bookmark className="w-3.5 h-3.5 text-purple-600" />,
          label: "Keep 메모 추가",
          bgColor: "bg-purple-50 text-purple-700 border-purple-200",
        };
      default:
        return {
          icon: <Bell className="w-3.5 h-3.5 text-slate-600" />,
          label: "활동",
          bgColor: "bg-slate-50 text-slate-700 border-slate-200",
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-2xl mx-auto w-full space-y-4">
        {/* Feed Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🔔</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">활동 피드 (Feed)</h2>
              <p className="text-xs text-slate-500">
                캘린더 멤버들이 등록하거나 변경한 최근 소식을 확인하세요.
              </p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            새로고침
          </button>
        </div>

        {/* Activity Stream */}
        <div className="space-y-3">
          {activities.map((act) => {
            const badge = getActionBadge(act.action);
            const timeAgo = formatDistanceToNow(new Date(act.createdAt), {
              addSuffix: true,
              locale: ko,
            });

            return (
              <div
                key={act.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-start space-x-3.5 transition-all hover:border-slate-300"
              >
                {/* User avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs text-white font-bold shrink-0 mt-0.5 shadow-xs overflow-hidden"
                  style={{ backgroundColor: act.user.color || "#10B981" }}
                >
                  {act.user.avatarUrl ? (
                    <img src={withBase(act.user.avatarUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    act.user.name.charAt(0)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-bold text-slate-900">{act.user.name}</span>
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bgColor}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium ml-auto">
                      {timeAgo}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-800 break-words">
                    {act.targetTitle}
                  </p>

                  <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <span>{format(new Date(act.createdAt), "yyyy.MM.dd HH:mm")}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {activities.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <span className="text-3xl">📭</span>
              <h3 className="text-sm font-bold text-slate-800 mt-2">최근 활동 내역이 없습니다</h3>
              <p className="text-xs text-slate-400 mt-1">
                일정을 등록하거나 댓글을 달면 여기에 실시간으로 기록됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
