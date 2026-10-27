"use client";

import { apiFetch } from "@/lib/base-path";
import React, { useState } from "react";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  CalendarPlus,
  Sparkles,
  CheckCircle2,
  FileText,
  Calendar,
} from "lucide-react";
import { KeepItemDto, KeepChecklistItem, UserDto, CalendarDto } from "@/types";

interface KeepViewProps {
  items: KeepItemDto[];
  activeCalendar: CalendarDto | null;
  currentUser: UserDto | null;
  onRefresh: () => void;
  onConvertToEvent: (title: string, description: string) => void;
}

export default function KeepView({
  items,
  activeCalendar,
  currentUser,
  onRefresh,
  onConvertToEvent,
}: KeepViewProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isChecklist, setIsChecklist] = useState(true);
  const [textContent, setTextContent] = useState("");
  const [checklistItems, setChecklistItems] = useState<string[]>([""]);
  const [selectedColor, setSelectedColor] = useState("#FEF3C7"); // Default soft amber

  const colorPalette = [
    "#FEF3C7", // Amber
    "#DCFCE7", // Mint
    "#E0E7FF", // Indigo
    "#FCE7F3", // Pink
    "#F3E8FF", // Purple
    "#F1F5F9", // Slate
  ];

  const handleToggleCheckItem = async (keepItem: KeepItemDto, checkIdx: number) => {
    try {
      if (!keepItem.content) return;
      const parsed: KeepChecklistItem[] = JSON.parse(keepItem.content);
      parsed[checkIdx].done = !parsed[checkIdx].done;

      const allDone = parsed.every((p) => p.done);

      await apiFetch("/api/keep", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: keepItem.id,
          content: JSON.stringify(parsed),
          isCompleted: allDone,
        }),
      });

      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleComplete = async (keepItem: KeepItemDto) => {
    try {
      await apiFetch("/api/keep", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: keepItem.id,
          isCompleted: !keepItem.isCompleted,
        }),
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("이 보관 메모를 삭제하시겠습니까?")) return;
    try {
      await apiFetch(`/api/keep?id=${id}`, { method: "DELETE" });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateKeep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !activeCalendar || !currentUser) return;

    let finalContent = textContent;
    if (isChecklist) {
      const validItems = checklistItems
        .filter((t) => t.trim().length > 0)
        .map((text, idx) => ({ id: String(idx + 1), text, done: false }));
      finalContent = JSON.stringify(validItems);
    }

    try {
      await apiFetch("/api/keep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId: activeCalendar.id,
          title,
          content: finalContent,
          isChecklist,
          color: selectedColor,
        }),
      });

      setTitle("");
      setTextContent("");
      setChecklistItems([""]);
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Keep Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl">📌</span>
              <h2 className="text-lg font-bold text-slate-900">Keep (보관함)</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              날짜가 아직 정해지지 않은 메모, 위시리스트, 장보기 목록 등을 저장하고 일정으로 변환해 보세요.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>새 메모/할 일 추가</span>
          </button>
        </div>

        {/* Keep Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            let checklist: KeepChecklistItem[] = [];
            if (item.isChecklist && item.content) {
              try {
                checklist = JSON.parse(item.content);
              } catch (e) {}
            }

            return (
              <div
                key={item.id}
                style={{ backgroundColor: item.color || "#ffffff" }}
                className={`rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                  item.isCompleted ? "opacity-75" : ""
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <h3
                      className={`text-sm font-bold text-slate-900 break-words ${
                        item.isCompleted ? "line-through text-slate-500" : ""
                      }`}
                    >
                      {item.title}
                    </h3>
                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Checklist items or text */}
                  {item.isChecklist ? (
                    <div className="space-y-1.5 my-3">
                      {checklist.map((c, idx) => (
                        <div
                          key={c.id || idx}
                          onClick={() => handleToggleCheckItem(item, idx)}
                          className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900 select-none"
                        >
                          {c.done ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className={c.done ? "line-through text-slate-400" : ""}>
                            {c.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 whitespace-pre-wrap my-3 leading-relaxed">
                      {item.content}
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-black/5 flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
                      style={{ backgroundColor: item.creator.color || "#10B981" }}
                    >
                      {item.creator.name.charAt(0)}
                    </div>
                    <span>{item.creator.name}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() =>
                        onConvertToEvent(
                          item.title,
                          item.isChecklist
                            ? checklist.map((c) => `- ${c.text}`).join("\n")
                            : item.content || ""
                        )
                      }
                      className="flex items-center space-x-1 px-2 py-1 bg-white/90 hover:bg-white text-emerald-700 rounded-lg text-[10px] font-semibold border border-emerald-200/60 shadow-2xs transition-all"
                      title="일정으로 등록"
                    >
                      <CalendarPlus className="w-3 h-3" />
                      <span>일정 등록</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {items.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <span className="text-3xl">📝</span>
            <h3 className="text-sm font-bold text-slate-800 mt-2">보관된 메모가 없습니다</h3>
            <p className="text-xs text-slate-400 mt-1">
              아직 날짜를 정하지 못한 아이디어나 체크리스트를 기록해 보세요.
            </p>
          </div>
        )}
      </div>

      {/* Add Keep Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">새 Keep 메모 추가</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleCreateKeep} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">제목</label>
                <input
                  type="text"
                  placeholder="예: 🛒 주말 장보기 리스트, 가고 싶은 카페"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              {/* Type toggle */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsChecklist(true)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center space-x-1.5 transition-colors ${
                    isChecklist
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>체크리스트 형식</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsChecklist(false)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center space-x-1.5 transition-colors ${
                    !isChecklist
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>일반 텍스트 메모</span>
                </button>
              </div>

              {/* Content area */}
              {isChecklist ? (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600">체크 항목</label>
                  {checklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <Square className="w-4 h-4 text-slate-300 shrink-0" />
                      <input
                        type="text"
                        placeholder={`항목 ${idx + 1}`}
                        value={item}
                        onChange={(e) => {
                          const updated = [...checklistItems];
                          updated[idx] = e.target.value;
                          setChecklistItems(updated);
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                      {checklistItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setChecklistItems(checklistItems.filter((_, i) => i !== idx));
                          }}
                          className="text-slate-400 hover:text-rose-500 text-xs px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setChecklistItems([...checklistItems, ""])}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center space-x-1 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>항목 추가</span>
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">내용</label>
                  <textarea
                    rows={4}
                    placeholder="메모할 내용을 자유롭게 적어보세요"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Color picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  카드 색상
                </label>
                <div className="flex items-center space-x-2">
                  {colorPalette.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSelectedColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        selectedColor === col
                          ? "border-emerald-600 scale-110 shadow-xs"
                          : "border-slate-300"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  보관함에 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
