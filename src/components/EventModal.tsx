"use client";

import { apiFetch, withBase } from "@/lib/base-path";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  X,
  Clock,
  MapPin,
  Link as LinkIcon,
  AlignLeft,
  Users,
  Repeat,
  Tag,
  Trash2,
  Image as ImageIcon,
  Upload,
  Loader2,
} from "lucide-react";
import { EventDto, CalendarDto, UserDto, LabelDto } from "@/types";
import { sendLocalNotification } from "@/lib/notifications";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: EventDto | null;
  initialDate?: Date;
  initialTitle?: string;
  initialDescription?: string;
  calendars: CalendarDto[];
  activeCalendar: CalendarDto | null;
  currentUser: UserDto | null;
  onSaved: () => void;
  onDeleted?: (id: string) => void;
}

export default function EventModal({
  isOpen,
  onClose,
  eventToEdit,
  initialDate,
  initialTitle = "",
  initialDescription = "",
  calendars,
  activeCalendar,
  currentUser,
  onSaved,
  onDeleted,
}: EventModalProps) {
  const [calendarId, setCalendarId] = useState("");
  const [title, setTitle] = useState("");
  const [labelId, setLabelId] = useState<string | null>(null);
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDateStr, setStartDateStr] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("09:00");
  const [endDateStr, setEndDateStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("10:00");
  const [recurrenceRule, setRecurrenceRule] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<{ fileUrl: string; fileName: string; fileType: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Initialize form state
  useEffect(() => {
    if (eventToEdit) {
      setCalendarId(eventToEdit.calendarId);
      setTitle(eventToEdit.title);
      setLabelId(eventToEdit.labelId || null);
      setIsAllDay(eventToEdit.isAllDay);
      const start = new Date(eventToEdit.startAt);
      const end = new Date(eventToEdit.endAt);
      setStartDateStr(format(start, "yyyy-MM-dd"));
      setStartTimeStr(format(start, "HH:mm"));
      setEndDateStr(format(end, "yyyy-MM-dd"));
      setEndTimeStr(format(end, "HH:mm"));
      setRecurrenceRule(eventToEdit.recurrenceRule || "");
      setLocation(eventToEdit.location || "");
      setUrl(eventToEdit.url || "");
      setDescription(eventToEdit.description || "");
      setParticipantIds(eventToEdit.participants?.map((p) => p.userId) || []);
      setAttachments(eventToEdit.attachments?.map((a) => ({ fileUrl: a.fileUrl, fileName: a.fileName, fileType: a.fileType })) || []);
    } else {
      const baseDate = initialDate || new Date();
      const defaultCal = activeCalendar || calendars[0];
      setCalendarId(defaultCal?.id || "");
      setTitle(initialTitle || "");
      setLabelId(defaultCal?.labels?.[0]?.id || null);
      setIsAllDay(false);
      setStartDateStr(format(baseDate, "yyyy-MM-dd"));
      setEndDateStr(format(baseDate, "yyyy-MM-dd"));
      setStartTimeStr(format(baseDate, "HH:00"));
      const nextHour = new Date(baseDate);
      nextHour.setHours(nextHour.getHours() + 1);
      setEndTimeStr(format(nextHour, "HH:00"));
      setRecurrenceRule("");
      setLocation("");
      setUrl("");
      setDescription(initialDescription || "");
      setParticipantIds(currentUser ? [currentUser.id] : []);
      setAttachments([]);
    }
  }, [eventToEdit, initialDate, initialTitle, initialDescription, activeCalendar, calendars, currentUser, isOpen]);

  // Moving the start keeps the event length, so the end never ends up before the start.
  const shiftEnd = (nextDate: string, nextTime: string) => {
    const oldStart = new Date(`${startDateStr}T${startTimeStr}`);
    const oldEnd = new Date(`${endDateStr}T${endTimeStr}`);
    const newStart = new Date(`${nextDate}T${nextTime}`);
    if ([oldStart, oldEnd, newStart].some((d) => Number.isNaN(d.getTime()))) return;
    const newEnd = new Date(newStart.getTime() + Math.max(0, oldEnd.getTime() - oldStart.getTime()));
    setEndDateStr(format(newEnd, "yyyy-MM-dd"));
    setEndTimeStr(format(newEnd, "HH:mm"));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await apiFetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const uploaded = await res.json();
          setAttachments((prev) => [
            ...prev,
            { fileUrl: uploaded.url, fileName: uploaded.fileName, fileType: uploaded.fileType },
          ]);
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  const currentCalObj = calendars.find((c) => c.id === calendarId) || activeCalendar || calendars[0];
  const labels: LabelDto[] = currentCalObj?.labels || [];
  const members = currentCalObj?.members || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !calendarId || !currentUser) return;

    setError("");

    const startDateTime = new Date(`${startDateStr}T${isAllDay ? "00:00:00" : startTimeStr}`);
    const endDateTime = new Date(`${endDateStr}T${isAllDay ? "23:59:59" : endTimeStr}`);

    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      setError("날짜와 시간을 확인해 주세요.");
      return;
    }
    if (endDateTime < startDateTime) {
      setError("종료 시간은 시작 시간보다 빠를 수 없습니다.");
      return;
    }

    setLoading(true);
    try {
      let res: Response;
      if (eventToEdit) {
        // Update
        res = await apiFetch(`/api/events/${eventToEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            calendarId,
            labelId,
            isAllDay,
            startAt: startDateTime.toISOString(),
            endAt: endDateTime.toISOString(),
            recurrenceRule: recurrenceRule || null,
            location,
            url,
            description,
            participantIds,
            attachments,
          }),
        });
      } else {
        // Create
        res = await apiFetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calendarId,
            title,
            labelId,
            isAllDay,
            startAt: startDateTime.toISOString(),
            endAt: endDateTime.toISOString(),
            recurrenceRule: recurrenceRule || null,
            location,
            url,
            description,
            participantIds,
            attachments,
          }),
        });

        if (res.ok) sendLocalNotification(`🗓️ 새 일정이 등록되었습니다: ${title}`, {
          body: `${format(startDateTime, "M월 d일")} ${location ? `· ${location}` : ""}`,
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError("서버와 통신하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!eventToEdit) return;
    if (!confirm("정말로 이 일정을 삭제하시겠습니까?")) return;

    try {
      const res = await apiFetch(`/api/events/${eventToEdit.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "삭제하지 못했습니다.");
        return;
      }
      if (onDeleted) onDeleted(eventToEdit.id);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleParticipant = (userId: string) => {
    if (participantIds.includes(userId)) {
      setParticipantIds(participantIds.filter((id) => id !== userId));
    } else {
      setParticipantIds([...participantIds, userId]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            {eventToEdit ? "일정 수정" : "새 일정 등록"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Title */}
          <div>
            <input
              type="text"
              placeholder="일정 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-base sm:text-lg font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:font-normal placeholder:text-slate-400"
              required
              autoFocus
            />
          </div>

          {/* Calendar Picker (if multiple) */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 w-16 shrink-0">캘린더</span>
            <select
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
            >
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>

          {/* Label / Color Selector */}
          {labels.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5" />
                <span>라벨 선택</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((l) => {
                  const isSelected = labelId === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLabelId(l.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center space-x-1.5 border transition-all ${
                        isSelected
                          ? "ring-2 ring-emerald-500 shadow-xs text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                      style={{
                        backgroundColor: isSelected ? l.colorHex : undefined,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: isSelected ? "#ffffff" : l.colorHex }}
                      />
                      <span>{l.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Day Toggle */}
          <div className="flex items-center justify-between py-1 border-t border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-700">종일 (All-day)</span>
            <button
              type="button"
              onClick={() => setIsAllDay(!isAllDay)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                isAllDay ? "bg-emerald-500 justify-end" : "bg-slate-200 justify-start"
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* Date & Time Selectors */}
          <div className="space-y-2">
            {/* Start */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500 w-12 shrink-0">시작</span>
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => {
                  shiftEnd(e.target.value, startTimeStr);
                  setStartDateStr(e.target.value);
                }}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                required
              />
              {!isAllDay && (
                <input
                  type="time"
                  value={startTimeStr}
                  onChange={(e) => {
                    shiftEnd(startDateStr, e.target.value);
                    setStartTimeStr(e.target.value);
                  }}
                  className="w-32 px-2 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              )}
            </div>

            {/* End */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500 w-12 shrink-0">종료</span>
              <input
                type="date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                required
              />
              {!isAllDay && (
                <input
                  type="time"
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  className="w-32 px-2 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              )}
            </div>
          </div>

          {/* Recurrence Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 w-12 shrink-0 flex items-center space-x-1">
              <Repeat className="w-3.5 h-3.5" />
              <span>반복</span>
            </span>
            <select
              value={recurrenceRule}
              onChange={(e) => setRecurrenceRule(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">반복 안함</option>
              <option value="FREQ=DAILY">매일 반복</option>
              <option value="FREQ=WEEKLY">매주 반복</option>
              <option value="FREQ=MONTHLY">매월 반복</option>
              <option value="FREQ=YEARLY">매년 반복</option>
            </select>
          </div>

          {/* Location */}
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="장소 / 위치 (예: 광화문 디타워, 집, 회사)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* URL */}
          <div className="flex items-center space-x-2">
            <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="url"
              placeholder="관련 링크 URL (https://...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-xs font-semibold text-slate-500">
              <AlignLeft className="w-3.5 h-3.5" />
              <span>상세 메모</span>
            </div>
            <textarea
              rows={3}
              placeholder="일정과 관련된 메모나 준비물을 적어보세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Photo & File Attachments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>사진 및 영수증/티켓 첨부 ({attachments.length})</span>
              </span>
              <label className="cursor-pointer flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors">
                <Upload className="w-3 h-3" />
                <span>{uploading ? "업로드 중..." : "사진 추가"}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Thumbnail previews */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group shadow-xs"
                  >
                    <img
                      src={withBase(att.fileUrl)}
                      alt={att.fileName}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] transition-colors"
                      title="삭제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Participants Selection */}
          {members.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
                <Users className="w-3.5 h-3.5" />
                <span>참여자 선택</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const isSelected = participantIds.includes(m.userId);
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => toggleParticipant(m.userId)}
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] text-white"
                        style={{ backgroundColor: m.user.color || "#10B981" }}
                      >
                        {m.user.name.charAt(0)}
                      </div>
                      <span>{m.user.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {eventToEdit ? (
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
                {loading ? "저장 중..." : eventToEdit ? "수정 완료" : "일정 등록"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
