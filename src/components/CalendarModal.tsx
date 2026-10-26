"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2, Palette } from "lucide-react";
import { CalendarDto, UserDto } from "@/types";

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendarToEdit?: CalendarDto | null;
  currentUser: UserDto | null;
  onSaved: () => void;
  onDeleted?: (id: string) => void;
}

export default function CalendarModal({
  isOpen,
  onClose,
  calendarToEdit,
  currentUser,
  onSaved,
  onDeleted,
}: CalendarModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#10B981");
  const [loading, setLoading] = useState(false);

  const colors = [
    "#10B981", // Emerald
    "#3B82F6", // Blue
    "#EC4899", // Pink
    "#F59E0B", // Amber
    "#8B5CF6", // Purple
    "#06B6D4", // Cyan
    "#EF4444", // Red
    "#64748B", // Slate
  ];

  useEffect(() => {
    if (calendarToEdit) {
      setName(calendarToEdit.name);
      setDescription(calendarToEdit.description || "");
      setColor(calendarToEdit.color);
    } else {
      setName("");
      setDescription("");
      setColor("#10B981");
    }
  }, [calendarToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentUser) return;

    setLoading(true);
    try {
      if (calendarToEdit) {
        await fetch(`/api/calendars/${calendarToEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, color }),
        });
      } else {
        await fetch("/api/calendars", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            color,
          }),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!calendarToEdit) return;
    if (!confirm(`'${calendarToEdit.name}' 캘린더를 정말 삭제하시겠습니까? 관련 모든 일정이 삭제됩니다.`)) return;

    try {
      await fetch(`/api/calendars/${calendarToEdit.id}`, { method: "DELETE" });
      if (onDeleted) onDeleted(calendarToEdit.id);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            {calendarToEdit ? "캘린더 설정" : "새 캘린더 만들기"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">캘린더 이름</label>
            <input
              type="text"
              placeholder="예: 우리 가족 캘린더, 커플 일정, 스터디"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">설명 (선택)</label>
            <input
              type="text"
              placeholder="캘린더에 대한 간단한 설명을 입력하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center space-x-1">
              <Palette className="w-3.5 h-3.5" />
              <span>대표 색상</span>
            </label>
            <div className="flex items-center space-x-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? "ring-2 ring-offset-2 ring-emerald-500 scale-110 shadow-xs" : ""
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {calendarToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center space-x-1 text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>삭제</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
              >
                {loading ? "저장 중..." : calendarToEdit ? "수정 완료" : "캘린더 생성"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
