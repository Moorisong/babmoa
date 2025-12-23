# 밥모아 (Babmoa)

> 🍽️ 팀 회식 장소 투표 & 주차 정보 공유 서비스

회식 장소 선정의 번거로움을 해결하는 웹 서비스입니다.

---

## 📌 주요 기능

### 🗺️ 지도 기반 장소 선택
- **카카오맵 통합**: 지도에서 직접 마커 클릭으로 후보 장소 선택
- **지역 필터**: 강남구, 관악구, 영등포구 지원
- **검색 추가**: 검색으로 원하는 식당 직접 추가

### 🗳️ 회식 투표
- **간편한 투표 생성**: 제목, 후보 장소, 마감 시간 설정
- **익명 참여**: 로그인 없이 링크만으로 투표 참여
- **실시간 카운트다운**: 남은 시간 실시간 표시
- **"상관없음" 옵션**: 투표자가 패스 가능 (옵션)
- **자동 마감**: 설정한 마감 시간에 투표 자동 종료

### 🅿️ 주차 정보
- **사용자 참여 기반**: 실제 방문자가 남긴 주차 경험 데이터
- **주차 뱃지**: 주차 수월 / 애매함 / 거의 불가 표시
- **성공률 표시**: 주차 성공률 및 방문 횟수 통계
- **시간대별 분석**: 평일 점심, 평일 저녁, 주말 구분

### 🔗 공유 기능
- **네이티브 공유**: 모바일에서 카카오톡 등 앱 공유
- **링크 복사**: 클릭 한 번으로 URL 복사

### 📱 모바일 UX
- **바텀시트 UI**: 장소 정보 스와이프로 열기/닫기
- **Pull-to-refresh 방지**: 바텀시트 내 스와이프 시 새로고침 차단
- **터치 최적화**: 모바일 환경에 최적화된 인터랙션

---

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | Node.js, Express |
| **Database** | MongoDB |
| **External API** | Kakao Maps API (서버 전용) |
| **Hosting** | Vercel (Frontend), 자체 서버 (Backend) |

---

## 📁 프로젝트 구조

```
babmoa/
├── packages/
│   ├── client/              # Next.js 프론트엔드
│   │   └── src/
│   │       ├── app/         # 페이지 (App Router)
│   │       ├── components/  # 컴포넌트
│   │       └── lib/         # API 클라이언트, utils
│   └── server/              # Express 백엔드
│       └── src/
│           ├── controllers/ # API 핸들러
│           ├── models/      # MongoDB 스키마
│           ├── routes/      # API 라우트
│           └── services/    # 비즈니스 로직
├── docs/                    # 프로젝트 문서
└── package.json             # npm workspaces
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
# packages/client/.env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_KAKAO_JS_KEY=your_kakao_js_key

# packages/server/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/babmoa
KAKAO_REST_API_KEY=your_kakao_rest_api_key
```

### 개발 서버 실행

```bash
# 터미널 1: 백엔드
npm run dev:server

# 터미널 2: 프론트엔드
npm run dev:client
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## 📄 페이지 구성

| 경로 | 설명 |
|------|------|
| `/` | 메인 (지도 기반 투표방 생성) |
| `/room/[id]` | 투표 참여 |
| `/room/[id]/result` | 투표 결과 |
| `/room/[id]/parking` | 주차 경험 기록 |
| `/privacy` | 개인정보처리방침 |
| `/terms` | 이용약관 |

---

## 🔌 API 엔드포인트

### 투표
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/rooms` | 투표방 생성 |
| GET | `/api/rooms/:id` | 투표방 조회 (주차 정보 포함) |
| POST | `/api/rooms/:id/vote` | 투표하기 |
| GET | `/api/rooms/:id/results` | 투표 결과 조회 |

### 주차
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/parking` | 주차 경험 기록 |
| GET | `/api/parking/:placeId/stats` | 장소별 주차 통계 |

### 장소
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/places/search` | 장소 검색 (카카오맵) |
| GET | `/api/places/district/:district` | 지역별 장소 목록 |

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
- **서버 API 호출**: 카카오 API는 서버에서만 호출
- **데이터 신뢰도**: 주차 기록 3건 이상일 때만 성공률 표시
- **지역 제한**: 현재 강남구, 관악구, 영등포구만 지원

