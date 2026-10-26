"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, Users, ArrowRight, Sparkles, Lock, Mail, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { UserDto } from "@/types";

function InviteContent() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;

  const [calendar, setCalendar] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // 1. Fetch invite info
        const calRes = await fetch(`/api/invite/${code}`);
        if (!calRes.ok) {
          setError("유효하지 않거나 만료된 초대 링크입니다.");
          return;
        }
        const calData = await calRes.json();
        setCalendar(calData);

        // 2. Check if already logged in
        const authRes = await fetch("/api/auth/me");
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.user) {
            setCurrentUser(authData.user);
          }
        }
      } catch (err) {
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    if (code) {
      loadData();
    }
  }, [code]);

  // If already logged in, join with current user
  const handleJoinExisting = async () => {
    if (!currentUser) return;
    setJoining(true);
    setError("");

    try {
      const joinRes = await fetch(`/api/invite/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (!joinRes.ok) {
        setError("캘린더 참여에 실패했습니다.");
        setJoining(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError("오류가 발생했습니다.");
      setJoining(false);
    }
  };

  // If not logged in, signup with inviteCode directly
  const handleSignupAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true);
    setError("");

    try {
      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          inviteCode: code,
        }),
      });

      const data = await signupRes.json();

      if (!signupRes.ok) {
        setError(data.error || "가입 및 참여에 실패했습니다.");
        setJoining(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError("오류가 발생했습니다.");
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (error || !calendar) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            ✕
          </div>
          <h2 className="text-base font-bold text-slate-800">초대 링크 오류</h2>
          <p className="text-xs text-slate-500">{error || "캘린더를 찾을 수 없습니다."}</p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Banner */}
        <div
          className="p-6 text-white text-center relative overflow-hidden"
          style={{ backgroundColor: calendar.color || "#10B981" }}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Calendar className="w-7 h-7 text-white" />
          </div>
          <p className="text-xs uppercase font-bold tracking-widest text-white/80">TimeTree Invite</p>
          <h1 className="text-2xl font-black mt-1">{calendar.name}</h1>
          {calendar.description && (
            <p className="text-xs text-white/90 mt-1.5 max-w-xs mx-auto">{calendar.description}</p>
          )}

          <div className="inline-flex items-center space-x-1.5 bg-black/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold mt-4">
            <Users className="w-3.5 h-3.5" />
            <span>현재 {calendar._count?.members || 1}명의 멤버 참여 중</span>
          </div>
        </div>

        {/* Content based on login state */}
        <div className="p-6">
          {currentUser ? (
            /* Logged in User view */
            <div className="space-y-4 text-center">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center space-x-3 text-left">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm text-white font-bold shrink-0"
                  style={{ backgroundColor: currentUser.color || "#10B981" }}
                >
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    <span className="text-emerald-700">{currentUser.name}</span> 계정으로 로그인되어 있습니다.
                  </p>
                  <p className="text-[10px] text-slate-400">{currentUser.email}</p>
                </div>
              </div>

              {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

              <button
                type="button"
                onClick={handleJoinExisting}
                disabled={joining}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2"
              >
                <span>{joining ? "참여 처리 중..." : "이 캘린더에 지금 참여하기"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  setCurrentUser(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                다른 계정으로 로그인하기
              </button>
            </div>
          ) : (
            /* Non-logged in User view: Signup or redirect to login */
            <form onSubmit={handleSignupAndJoin} className="space-y-4">
              <div className="text-center pb-1">
                <h3 className="text-sm font-bold text-slate-800">새 계정으로 간편 가입 후 참여</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  이미 계정이 있으시다면{" "}
                  <Link
                    href={`/login?invite=${code}`}
                    className="text-emerald-600 font-bold hover:underline"
                  >
                    여기서 로그인
                  </Link>
                  하세요.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">이름</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="예: 홍길동, 아빠, 영희"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

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
                    placeholder="비밀번호 (최소 8자리)"
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
                disabled={joining}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5"
              >
                <span>{joining ? "가입 및 참여 중..." : "회원가입하고 캘린더 참여하기"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InviteJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
