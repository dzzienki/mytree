"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Lock,
  Palette,
  Camera,
  Check,
  Loader2,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { UserDto } from "@/types";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserDto | null;
  onUserUpdated: (updatedUser: UserDto) => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}: UserProfileModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10B981");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Password fields
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const colorPalette = [
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
    if (currentUser) {
      setName(currentUser.name || "");
      setColor(currentUser.color || "#10B981");
      setAvatarUrl(currentUser.avatarUrl || null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
      setError("");
      setSuccessMsg("");
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  // Handle avatar image upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        setError("프로필 이미지 업로드에 실패했습니다.");
        return;
      }

      const data = await res.json();
      setAvatarUrl(data.url);
    } catch (err) {
      setError("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }

    if (isChangingPassword) {
      if (!currentPassword) {
        setError("현재 비밀번호를 입력해 주세요.");
        return;
      }
      if (newPassword.length < 8) {
        setError("새 비밀번호는 최소 8자리 이상이어야 합니다.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        color,
        avatarUrl,
      };

      if (isChangingPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "수정에 실패했습니다.");
        setSaving(false);
        return;
      }

      onUserUpdated(data.user);
      setSuccessMsg("회원정보가 성공적으로 변경되었습니다!");
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">회원정보 관리</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Avatar & Profile Photo Section */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="relative group">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md overflow-hidden border-2 border-white ring-2 ring-slate-100"
                style={{ backgroundColor: color }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  name.charAt(0) || "U"
                )}
              </div>

              {/* Upload Overlay Button */}
              <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                <Camera className="w-6 h-6" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-xs text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer">
                {uploadingAvatar ? "업로드 중..." : "사진 변경"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>

              {avatarUrl && (
                <>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    className="text-xs text-rose-500 hover:text-rose-600 font-medium"
                  >
                    기본 아바타로 복원
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">이메일 주소</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                readOnly
                value={currentUser.email}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono cursor-not-allowed focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">계정 고유 식별 이메일은 변경할 수 없습니다.</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">이름 (닉네임)</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
                required
              />
            </div>
          </div>

          {/* Theme Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center space-x-1">
              <Palette className="w-3.5 h-3.5" />
              <span>프로필 대표 색상</span>
            </label>
            <div className="flex items-center space-x-2">
              {colorPalette.map((c) => (
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

          {/* Password Change Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isChangingPassword ? "비밀번호 변경 취소" : "비밀번호 변경하기"}</span>
            </button>

            {isChangingPassword && (
              <div className="mt-3 space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    현재 비밀번호
                  </label>
                  <input
                    type="password"
                    placeholder="현재 비밀번호를 입력하세요"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    새 비밀번호 (최소 8자리)
                  </label>
                  <input
                    type="password"
                    placeholder="새로운 비밀번호"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    새 비밀번호 확인
                  </label>
                  <input
                    type="password"
                    placeholder="새로운 비밀번호 다시 입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}
          {successMsg && (
            <p className="text-xs text-emerald-600 font-bold flex items-center space-x-1">
              <Check className="w-4 h-4" />
              <span>{successMsg}</span>
            </p>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              닫기
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? "저장 중..." : "변경사항 저장"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
