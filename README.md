# 밥모아 (Babmoa)

> 🍽️ 팀 회식 장소 투표 & 주차 정보 공유 서비스

회식 장소 선정의 번거로움을 해결하는 웹 서비스입니다.

---

## 📌 주요 기능

### 🗳️ 회식 투표
- **간편한 투표 생성**: 제목, 후보 장소, 마감 시간 설정
- **익명 참여**: 로그인 없이 링크만으로 투표 참여
- **실시간 결과**: 투표 마감 후 결과 자동 확정

### 🅿️ 주차 정보
- **사용자 참여 기반**: 실제 방문자가 남긴 주차 경험 데이터
- **성공률 표시**: 주차 성공률 및 방문 횟수 통계
- **참고용 정보**: 시간대별 주차 난이도 안내

---

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js 15, React 19, TypeScript |
| **Backend** | Node.js, Express |
| **Database** | MongoDB |
| **External API** | Kakao Maps API (서버 전용) |

---

## 📁 프로젝트 구조

```
babmoa/
├── packages/
│   ├── client/          # Next.js 프론트엔드
│   │   └── src/
│   │       ├── app/     # 페이지 (App Router)
│   │       ├── components/
│   │       └── lib/     # API 클라이언트, hooks
│   └── server/          # Express 백엔드
│       └── src/
│           ├── models/  # MongoDB 스키마
│           ├── routes/  # API 엔드포인트
│           └── services/
├── docs/                # 프로젝트 문서
└── package.json
```

---

## 🚀 시작하기

### 사전 요구사항
- Node.js 18+
- MongoDB
- Kakao Developers 계정 (API Key)

### 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp packages/server/.env.example packages/server/.env
# .env 파일에 MongoDB URI, Kakao API Key 입력
```

### 개발 서버 실행

```bash
# 터미널 1: 백엔드
cd packages/server
npm run dev

# 터미널 2: 프론트엔드
cd packages/client
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## 📄 페이지 구성

| 경로 | 설명 |
|------|------|
| `/` | 메인 (투표방 생성) |
| `/room/[id]` | 투표 참여 |
| `/room/[id]/result` | 투표 결과 |
| `/room/[id]/parking` | 주차 경험 기록 |
| `/privacy` | 개인정보처리방침 |
| `/terms` | 이용약관 |

---

## 📊 데이터 모델

| 컬렉션 | 설명 | 보관 기간 |
|--------|------|----------|
| VoteRoom | 투표방 정보 | 영구 |
| Vote | 투표 기록 | 영구 |
| ParkingData | 주차 경험 (원본) | 1년 (TTL) |
| ParkingStats | 주차 통계 (집계) | 영구 |

---

## 📋 주요 규칙

- **익명 참여**: 모든 기능은 로그인 없이 사용 가능
- **1인 1표**: participantId + roomId 조합으로 중복 방지
- **데이터 신뢰도**: 다수 기록 누적 시 신뢰도 상승
- **카카오 API**: 서버에서만 호출 (클라이언트 직접 호출 금지)
