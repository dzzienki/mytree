"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, Users, CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { UserDto } from "@/types";

function InviteContent() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;

  const [calendar, setCalendar] = useState<any>(null);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Fetch invite info
        const calRes = await fetch(`/api/invite/${code}`);
        if (!calRes.ok) {
          setError("유효하지 않거나 만료된 초대 링크입니다.");
          return;
        }
        const calData = await calRes.json();
        setCalendar(calData);

        // Fetch users
        const usersRes = await fetch("/api/users");
        if (usersRes.ok) {
          const uData = await usersRes.json();
          setUsers(uData);
          if (uData.length > 0) {
            setSelectedUserId(uData[0].id);
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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true);
    setError("");

    try {
      let targetUserId = selectedUserId;

      if (isCreatingNew) {
        if (!newUserName.trim() || !newUserEmail.trim()) {
          setError("이름과 이메일을 입력해 주세요.");
          setJoining(false);
          return;
        }

        const createRes = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newUserName.trim(),
            email: newUserEmail.trim(),
            color: "#3B82F6",
          }),
        });

        if (!createRes.ok) {
          setError("새 사용자 생성에 실패했습니다.");
          setJoining(false);
          return;
        }

        const newUser = await createRes.json();
        targetUserId = newUser.id;
      }

      const joinRes = await fetch(`/api/invite/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });

      if (!joinRes.ok) {
        setError("캘린더 참여에 실패했습니다.");
        setJoining(false);
        return;
      }

      router.push("/");
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
      <div className="bg-white rounded-3xl max-w-md w-full shadow-xl border border-slate-200/80 overflow-hidden">
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

        {/* Form */}
        <form onSubmit={handleJoin} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              어떤 사용자로 참여하시겠습니까?
            </label>

            {!isCreatingNew ? (
              <div className="space-y-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setIsCreatingNew(true)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-bold block"
                >
                  + 새 사용자 이름으로 등록하고 참여하기
                </button>
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    이름
                  </label>
                  <input
                    type="text"
                    placeholder="예: 홍길동, 엄마, 친구"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 underline block"
                >
                  기존 사용자로 선택하기
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={joining}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2"
          >
            <span>{joining ? "참여 처리 중..." : "캘린더 참여하기"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
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
