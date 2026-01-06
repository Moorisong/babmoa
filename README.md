# 밥모아 (Babmoa)

> 🍽️ 팀 회식 장소 투표 & 주차 정보 공유 서비스

회식 장소 선정의 번거로움을 해결하는 웹 서비스입니다. 전국 어디서나 검색하여 투표를 만들 수 있으며, 특정 지역의 상세한 주차 입지 분석 정보를 제공합니다.

---

## 📌 주요 기능

### 🗺️ 지도 기반 장소 선택
- **카카오맵 통합**: 지도에서 전국 모든 장소 검색 및 선택 가능
- **전국 검색**: "서울 맛집", "부산 카페" 등 지역 제한 없는 자유로운 검색
- **주차 정보**: 특정 지역은 상세 주차 분석 데이터 제공 (CORE_REGION)

### 🗳️ 회식 투표
- **간편한 투표 생성**: 제목, 후보 장소, 마감 시간 설정
- **익명 참여**: 로그인 없이 링크만으로 투표 참여
- **실시간 카운트다운**: 남은 시간 실시간 표시
- **"상관없음" 옵션**: 투표자가 패스 가능 (옵션)
- **자동 마감**: 설정한 마감 시간에 투표 자동 종료

### 🅿️ 주차 정보 (CORE_REGION)
- **주차 뱃지**: 특정 지역 마커에 주차 상태 표시 (수월/애매/불가)
- **성공률 통계**: 실제 주차 시도 대비 성공률, 시간대별(점심/저녁/주말) 분석
- **하이브리드 판별**: 서버 API 확인 전, 주소 기반으로 즉시 지역 상태를 감지하여 빠른 UX 제공
- **데이터 기반**: 운영자가 검증하고 승인한 지역(CORE)만 신뢰성 있는 정보 노출

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
| **Frontend** | Next.js 15, React, TypeScript, CSS Modules |
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
│   │       │   └── *.module.css  # 페이지별 CSS Modules
│   │       ├── components/  # 컴포넌트 (디렉토리 구조)
│   │       │   └── ComponentName/
│   │       │       ├── index.tsx
│   │       │       └── ComponentName.module.css
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
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_KAKAO_JS_KEY=your_kakao_js_key

# packages/server/.env
PORT=5001
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
- Backend: http://localhost:5001

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

### 주차 & 장소
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/parking` | 주차 경험 기록 |
| GET | `/api/parking/:placeId/stats` | 장소별 주차 통계 |
| GET | `/api/places/search` | 장소 검색 (전국) |
| POST | `/api/places/bulk-info` | 다중 장소 상세 정보 (주차/지역 상태) |
| GET | `/api/places/region-status` | 지역 상태 조회 |

---

## 📊 데이터 모델

| 컬렉션 | 설명 | 보관 기간 |
|--------|------|----------|
| VoteRoom | 투표방 정보 | 영구 |
| Vote | 투표 기록 | 영구 |
| ParkingData | 주차 경험 (원본) | 1년 (TTL) |
| ParkingStats | 주차 통계 (집계) | 영구 |
| RegionState | 지역별 승격 상태 관리 | 영구 |

---

## 📋 주요 규칙

- **익명 참여**: 모든 기능은 로그인 없이 사용 가능
- **1인 1표**: participantId + roomId 조합으로 중복 방지
- **서버 API 호출**: 카카오 API는 서버에서만 호출
- **데이터 신뢰도**: 주차 기록이 충분히 쌓인(120건+) 지역만 CORE_REGION으로 승격
- **전국 서비스**: 투표 생성은 전국 어디서나 가능, 주차 정보만 CORE 지역 한정 제공
