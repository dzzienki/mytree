"use client";

import { apiFetch } from "@/lib/base-path";
import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Lock, Mail, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Keep the invite code when moving between login and signup
  const signupHref = inviteCode ? `/signup?invite=${encodeURIComponent(inviteCode)}` : "/signup";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      // Existing account + invite: confirm joining on the invite page
      if (inviteCode) {
        router.push(`/invite/${inviteCode}`);
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err) {
      setError("서버 통신 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 p-8 text-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Calendar className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">mytree</h1>
          <p className="text-xs text-emerald-100 mt-1">함께 쓰는 소중한 일정과 약속</p>

          {inviteCode && (
            <div className="mt-4 bg-white/20 backdrop-blur-xs px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>캘린더 초대를 수락하려면 로그인하세요</span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-800">로그인</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">이메일</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">비밀번호</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5"
          >
            <span>{loading ? "처리 중..." : "로그인"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Move to the separate signup screen */}
          <div className="pt-3 border-t border-slate-100 text-center space-y-2">
            <p className="text-[11px] text-slate-400">아직 계정이 없으신가요?</p>
            <Link
              href={signupHref}
              className="block w-full py-2.5 bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-600 transition-colors"
            >
              회원가입
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
