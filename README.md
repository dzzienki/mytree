# mytree 🌿 (TimeTree 완벽 클론 웹 애플리케이션)

TimeTree의 핵심 UX/UI와 기능을 그대로 구현한 **개인 호스팅 & 가족/지인 공유 캘린더 서비스**입니다.

---

## 🌟 주요 기능

1. **다중 공유 캘린더**
   - 목적별(가족용, 개인용, 모임용 등) 캘린더 생성 및 분리
   - "모든 캘린더 모아보기" 통합 뷰 제공
   - 캘린더별 커스텀 대표 색상 및 라벨(태그) 설정

2. **4가지 캘린더 뷰**
   - **월간 뷰 (Month)**: TimeTree 특유의 직관적인 일자별/멀티데이 일정 뱃지, 오늘 날짜 인디케이터
   - **주간 뷰 (Week)**: 24시간 타임라인 기반 블록 스케줄
   - **목록 뷰 (List/Agenda)**: 날짜순 정렬된 다가오는 일정 카드
   - **피드 뷰 (Feed)**: 멤버들의 일정 추가, 수정, 댓글 작성 내역 실시간 타임라인

3. **TimeTree 시그니처: Keep (보관함)**
   - 날짜가 정해지지 않은 메모 및 체크리스트(To-do) 관리
   - 장보기 목록, 가보고 싶은 맛집 리스트 등 작성
   - 원클릭 **"일정으로 등록"** 지원

4. **일정별 피드 & 실시간 댓글 (소통)**
   - 개별 일정 카드 내에서 참여자 간의 채팅 및 댓글 스레드
   - 작성자 아바타 및 타임스탬프 기록

5. **공유 링크 및 멤버 초대 시스템**
   - 캘린더별 고유 초대 코드/링크 생성 (예: `/invite/family-mytree-2026`)
   - 초대받은 사용자가 이름/이메일을 입력하거나 기존 계정으로 즉시 참여 가능

---

## 🛠️ 기술 스택

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Database**: PostgreSQL 15.8 (전용 `mytree_db` 및 `mytree_user` 격리 계정)
- **ORM**: Prisma 6 (Type-safe 데이터베이스 클라이언트)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide Icons
- **Date Utilities**: date-fns, rrule (RFC 5545)

---

## 🚀 실행 방법

```bash
npm install
cp .env.example .env      # DATABASE_URL, JWT_SECRET 입력
npm run db:push           # DB 테이블 생성
npm run dev               # 개발 서버 (http://localhost:3000)
```

## 📦 배포

1. PostgreSQL 준비 후 환경변수 설정
   - `DATABASE_URL`: PostgreSQL 접속 문자열
   - `JWT_SECRET`: 세션 서명 키 (**필수**, `openssl rand -base64 48`로 생성)
2. `npm run db:push` 로 스키마 반영 후 `npm run build && npm start`
3. HTTPS 뒤에서 운영하세요 (세션 쿠키가 production에서 `secure`로 설정됩니다).

> 이미지 업로드는 서버의 `public/uploads/` 디렉터리에 저장합니다. 영구 디스크가 있는 서버(VPS, Docker 볼륨 등)에서 운영하거나,
> 서버리스(Vercel 등)에 배포한다면 S3/R2 같은 오브젝트 스토리지로 `src/app/api/upload/route.ts`를 교체해야 합니다.

## 👥 사용 방법

- **회원가입**: `/login` 의 회원가입 탭에서 이름, 이메일, 비밀번호(8자 이상) 입력 → 개인 캘린더가 자동 생성됩니다.
- **회원정보 / 비밀번호 변경**: 우측 상단 프로필 → 이름, 색상, 프로필 사진, 비밀번호 변경.
- **초대 & 공유**: 캘린더에서 초대 링크를 복사해 전달하면, 상대가 가입(또는 로그인)하는 즉시 같은 캘린더의
  일정, Keep, 댓글, 피드를 함께 보고 편집합니다. 캘린더 수정/삭제는 소유자만 가능합니다.
