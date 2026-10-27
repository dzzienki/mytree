"use client";

import { apiFetch, withBase } from "@/lib/base-path";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  X,
  Clock,
  MapPin,
  ExternalLink,
  Edit,
  Trash2,
  Users,
  MessageSquare,
  Send,
  Calendar,
  Share2,
  Image as ImageIcon,
} from "lucide-react";
import { EventDto, EventCommentDto, UserDto } from "@/types";

interface EventDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventDto | null;
  currentUser: UserDto | null;
  onEdit: (event: EventDto) => void;
  onDeleted: (id: string) => void;
  onCommentAdded?: () => void;
}

export default function EventDetailDrawer({
  isOpen,
  onClose,
  event,
  currentUser,
  onEdit,
  onDeleted,
  onCommentAdded,
}: EventDetailDrawerProps) {
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<EventCommentDto[]>([]);
  const [loadingComment, setLoadingComment] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (event?.id && isOpen) {
      if (event.comments && event.comments.length > 0) {
        setComments(event.comments);
      }
      // Always fetch latest comments from server
      apiFetch(`/api/events/${event.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.comments) {
            setComments(data.comments);
          }
        })
        .catch(console.error);
    }
  }, [event?.id, isOpen]);

  if (!isOpen || !event) return null;

  const labelColor = event.label?.colorHex || event.calendar?.color || "#10B981";
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser || !event) return;

    setLoadingComment(true);
    try {
      const res = await apiFetch(`/api/events/${event.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText.trim(),
        }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setCommentText("");
        if (onCommentAdded) onCommentAdded();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말로 이 일정을 삭제하시겠습니까?")) return;
    try {
      await apiFetch(`/api/events/${event.id}`, {
        method: "DELETE",
      });
      onDeleted(event.id);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Color Top Banner */}
          <div className="h-2 w-full" style={{ backgroundColor: labelColor }} />

          {/* Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center space-x-2 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: event.calendar?.color || "#10B981" }}
              />
              <span className="text-xs font-semibold text-slate-500 truncate">
                {event.calendar?.name || "캘린더"}
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => onEdit(event)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                title="수정"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Title & Label */}
            <div>
              {event.label && (
                <span
                  className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-2"
                  style={{
                    backgroundColor: `${labelColor}20`,
                    color: labelColor,
                  }}
                >
                  {event.label.name}
                </span>
              )}
              <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
                {event.title}
              </h2>
            </div>

            {/* Date & Time */}
            <div className="flex items-start space-x-3 text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <Clock className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-xs font-medium space-y-0.5">
                <p className="font-bold text-slate-900">
                  {format(start, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
                </p>
                <p className="text-slate-500">
                  {event.isAllDay
                    ? "종일 일정"
                    : `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`}
                </p>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start space-x-3 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900">{event.location}</span>
                  <a
                    href={`https://map.naver.com/v5/search/${encodeURIComponent(event.location)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[11px] text-emerald-600 hover:underline mt-0.5"
                  >
                    지도에서 위치 확인하기 →
                  </a>
                </div>
              </div>
            )}

            {/* URL */}
            {event.url && (
              <div className="flex items-center space-x-3 text-xs">
                <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                <a
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 hover:underline truncate"
                >
                  {event.url}
                </a>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                {event.description}
              </div>
            )}

            {/* Photo Attachments Gallery */}
            {event.attachments && event.attachments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>첨부된 사진 ({event.attachments.length}장)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {event.attachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => setPreviewImageUrl(att.fileUrl)}
                      className="aspect-square rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all shadow-2xs"
                    >
                      <img
                        src={withBase(att.fileUrl)}
                        alt={att.fileName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attendees / Participants */}
            {event.participants && event.participants.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                  <Users className="w-3.5 h-3.5" />
                  <span>참여자 ({event.participants.length}명)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center space-x-2 px-2.5 py-1 bg-slate-50 rounded-full border border-slate-200 text-xs text-slate-700"
                    >
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
                        style={{ backgroundColor: p.user.color || "#10B981" }}
                      >
                        {p.user.name.charAt(0)}
                      </div>
                      <span className="font-medium">{p.user.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Thread (TimeTree chat feature) */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>댓글 / 소통 피드 ({comments.length})</span>
              </div>

              <div className="space-y-2.5">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start space-x-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white font-bold shrink-0 mt-0.5 overflow-hidden"
                      style={{ backgroundColor: c.user?.color || "#10B981" }}
                    >
                      {c.user?.avatarUrl ? (
                        <img src={withBase(c.user.avatarUrl)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        c.user?.name.charAt(0) || "U"
                      )}
                    </div>

                    <div className="flex-1 bg-slate-50 rounded-2xl p-2.5 border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{c.user?.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {format(new Date(c.createdAt), "M.d HH:mm")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                ))}

                {comments.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">
                    아직 작성된 댓글이 없습니다. 첫 댓글을 남겨보세요!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Comment Input Footer */}
          <form
            onSubmit={handleAddComment}
            className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder={`${currentUser?.name || "나"} (으)로 댓글 달기...`}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={loadingComment || !commentText.trim()}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors shrink-0"
              title="전송"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Fullscreen Image Lightbox Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/40 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={withBase(previewImageUrl)}
            alt="첨부 이미지 확대"
            className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
