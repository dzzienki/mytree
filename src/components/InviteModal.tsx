"use client";

import { BASE_PATH, apiFetch, withBase } from "@/lib/base-path";
import React, { useState } from "react";
import { X, Copy, Check, Users, Share2, RefreshCw, UserMinus } from "lucide-react";
import { CalendarDto, UserDto } from "@/types";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendar: CalendarDto | null;
  currentUser: UserDto | null;
  /** Called after the invite link or member list changed so the parent reloads calendars. */
  onChanged: () => void | Promise<void>;
}

export default function InviteModal({ isOpen, onClose, calendar, currentUser, onChanged }: InviteModalProps) {
  const [copied, setCopied] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!isOpen || !calendar) return null;

  const myRole = calendar.members?.find((m) => m.userId === currentUser?.id)?.role;
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  // Calls a management endpoint, shows its error, and asks the parent to reload on success.
  const run = async (url: string, method: string, successNotice: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await apiFetch(url, { method });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "처리 중 오류가 발생했습니다.");
        return;
      }
      setNotice(successNotice);
      await onChanged();
    } catch (e) {
      setError("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
      setConfirmRegen(false);
      setConfirmRemoveId(null);
    }
  };

  const handleRegenerate = () =>
    run(`/api/calendars/${calendar.id}/invite`, "POST", "새 초대 링크를 만들었습니다. 이전 링크는 더 이상 사용할 수 없습니다.");

  const handleRemove = (userId: string) =>
    run(
      `/api/calendars/${calendar.id}/members/${userId}`,
      "DELETE",
      "멤버를 내보냈습니다. 이전 링크로 다시 참여할 수 있으니, 필요하면 링크를 재발급하세요."
    );

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const inviteUrl = `${origin}${BASE_PATH}/invite/${calendar.inviteCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">멤버 초대 및 공유</h3>
              <p className="text-xs text-slate-500">{calendar.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invite Link Box */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            초대 링크 (가족이나 친구에게 전달하세요)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-mono focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "복사됨!" : "링크 복사"}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            초대받은 사람은 링크를 클릭하여 캘린더에 참여할 수 있습니다.
          </p>

          {canManage && !confirmRegen && (
            <button
              type="button"
              onClick={() => setConfirmRegen(true)}
              disabled={busy}
              className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" />
              <span>링크 재발급 (기존 링크 무효화)</span>
            </button>
          )}

          {canManage && confirmRegen && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 space-y-2">
              <p className="text-[11px] text-rose-700">
                재발급하면 지금 링크는 더 이상 쓸 수 없습니다. 이미 참여한 멤버는 그대로 유지됩니다.
              </p>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={busy}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold disabled:opacity-50"
                >
                  {busy ? "처리 중..." : "재발급"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRegen(false)}
                  disabled={busy}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {notice && <p className="text-[11px] font-semibold text-emerald-700">{notice}</p>}
          {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
        </div>

        {/* Current Members List */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <div className="flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>현재 참여 멤버 ({calendar.members?.length || 1}명)</span>
            </div>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {calendar.members?.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white font-bold shrink-0 overflow-hidden"
                    style={{ backgroundColor: m.user?.color || "#10B981" }}
                  >
                    {m.user?.avatarUrl ? (
                      <img src={withBase(m.user.avatarUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      m.user?.name.charAt(0) || "U"
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{m.user?.name}</p>
                    <p className="text-[10px] text-slate-400">{m.user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.role === "OWNER"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {m.role === "OWNER" ? "방장 (Owner)" : "멤버"}
                  </span>

                  {canManage &&
                    m.userId !== currentUser?.id &&
                    m.role !== "OWNER" &&
                    (m.role !== "ADMIN" || myRole === "OWNER") &&
                    (confirmRemoveId === m.userId ? (
                      <span className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleRemove(m.userId)}
                          disabled={busy}
                          className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold disabled:opacity-50"
                        >
                          내보내기
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(null)}
                          disabled={busy}
                          className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold"
                        >
                          취소
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(m.userId)}
                        disabled={busy}
                        title="이 멤버를 캘린더에서 내보내기"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
