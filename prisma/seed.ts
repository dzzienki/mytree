import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding initial TimeTree data...");

  // 1. Create or upsert Users
  const me = await prisma.user.upsert({
    where: { email: "me@mytree.app" },
    update: {},
    create: {
      email: "me@mytree.app",
      name: "나 (호스트)",
      color: "#10B981",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "jiwoo@mytree.app" },
    update: {},
    create: {
      email: "jiwoo@mytree.app",
      name: "김지우",
      color: "#F59E0B",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80",
    },
  });

  // 2. Create Family Calendar
  const familyCal = await prisma.calendar.upsert({
    where: { inviteCode: "family-mytree-2026" },
    update: {},
    create: {
      name: "우리 가족 공유 캘린더",
      description: "가족들과 함께 쓰는 소중한 일상과 일정 🌿",
      color: "#10B981",
      inviteCode: "family-mytree-2026",
      members: {
        create: [
          { userId: me.id, role: "OWNER" },
          { userId: member.id, role: "MEMBER" },
        ],
      },
      labels: {
        create: [
          { name: "가족 / 모임", colorHex: "#10B981", orderIndex: 0 },
          { name: "기념일 / 축하", colorHex: "#EC4899", orderIndex: 1 },
          { name: "개인 일정", colorHex: "#3B82F6", orderIndex: 2 },
          { name: "업무 / 미팅", colorHex: "#F59E0B", orderIndex: 3 },
          { name: "여행 / 나들이", colorHex: "#8B5CF6", orderIndex: 4 },
          { name: "병원 / 건강", colorHex: "#EF4444", orderIndex: 5 },
        ],
      },
    },
    include: { labels: true },
  });

  // 3. Create Personal Calendar
  await prisma.calendar.upsert({
    where: { inviteCode: "personal-mytree-2026" },
    update: {},
    create: {
      name: "개인 플래너",
      description: "나만의 집중 일정 및 자기계발 🎯",
      color: "#3B82F6",
      inviteCode: "personal-mytree-2026",
      members: {
        create: [{ userId: me.id, role: "OWNER" }],
      },
      labels: {
        create: [
          { name: "공부 / 독서", colorHex: "#3B82F6", orderIndex: 0 },
          { name: "운동 / 헬스", colorHex: "#10B981", orderIndex: 1 },
          { name: "약속", colorHex: "#F59E0B", orderIndex: 2 },
        ],
      },
    },
  });

  // 4. Sample Events for Family Calendar
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  const familyLabel = familyCal.labels.find((l) => l.name === "가족 / 모임") || familyCal.labels[0];
  const tripLabel = familyCal.labels.find((l) => l.name === "여행 / 나들이") || familyCal.labels[0];
  const healthLabel = familyCal.labels.find((l) => l.name === "병원 / 건강") || familyCal.labels[0];

  const dinnerEvent = await prisma.event.create({
    data: {
      calendarId: familyCal.id,
      creatorId: me.id,
      labelId: familyLabel.id,
      title: "가족 저녁 식사 🍕",
      description: "주말 맞이 맛있는 저녁 먹기! 예약 완료되었습니다.",
      location: "광화문 디타워 지하 1층",
      url: "https://maps.naver.com",
      isAllDay: false,
      startAt: new Date(year, month, date, 18, 30),
      endAt: new Date(year, month, date, 20, 30),
      participants: {
        create: [{ userId: me.id }, { userId: member.id }],
      },
      comments: {
        create: [
          {
            userId: me.id,
            content: "제가 6시 30분에 먼저 가서 자리 잡아둘게요!",
          },
          {
            userId: member.id,
            content: "좋아요! 퇴근하고 바로 갈게요 ㅎㅎ",
          },
        ],
      },
    },
  });

  await prisma.event.create({
    data: {
      calendarId: familyCal.id,
      creatorId: member.id,
      labelId: healthLabel.id,
      title: "치과 정기 검진 🦷",
      description: "스케일링 및 충치 확인",
      location: "연세미소치과의원",
      isAllDay: false,
      startAt: new Date(year, month, date + 1, 14, 0),
      endAt: new Date(year, month, date + 1, 15, 0),
    },
  });

  await prisma.event.create({
    data: {
      calendarId: familyCal.id,
      creatorId: me.id,
      labelId: tripLabel.id,
      title: "가을 단풍 나들이 🍁 (설악산)",
      description: "단풍 구경 및 케이블카 타기",
      location: "강원도 속초시 설악산로",
      isAllDay: true,
      startAt: new Date(year, month, date + 5, 0, 0),
      endAt: new Date(year, month, date + 6, 23, 59),
      participants: {
        create: [{ userId: me.id }, { userId: member.id }],
      },
    },
  });

  // 5. Keep Items (TimeTree 미정 메모 및 할 일)
  await prisma.keepItem.create({
    data: {
      calendarId: familyCal.id,
      creatorId: me.id,
      title: "🛒 이번 주말 장보기 목록",
      content: JSON.stringify([
        { id: "1", text: "신선한 우유 1L", done: true },
        { id: "2", text: "유기농 사과 한 봉지", done: true },
        { id: "3", text: "친환경 주방세제", done: false },
        { id: "4", text: "동물복지 유정란 15구", done: false },
      ]),
      isChecklist: true,
      color: "#FEF3C7", // Light amber
    },
  });

  await prisma.keepItem.create({
    data: {
      calendarId: familyCal.id,
      creatorId: member.id,
      title: "🍣 나중에 꼭 가볼 맛집 리스트",
      content: "1. 스시야 (오마카세 추천)\n2. 삼청동 수제비\n3. 성수동 베이커리 카페 어니언",
      isChecklist: false,
      color: "#E0E7FF", // Light indigo
    },
  });

  // 6. Activity Log
  await prisma.activityLog.create({
    data: {
      calendarId: familyCal.id,
      userId: me.id,
      action: "CREATED_EVENT",
      targetTitle: dinnerEvent.title,
      details: JSON.stringify({ message: "새로운 일정을 등록했습니다." }),
    },
  });

  console.log("Seeding completed successfully! 🚀");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
