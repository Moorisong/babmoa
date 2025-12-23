# 기술 스택 & 아키텍처

## 기술 스택

| 영역 | 기술 | 이유 |
|------|------|------|
| 프론트엔드 | Next.js 14 | SSR/SEO, App Router |
| 스타일링 | Tailwind CSS | 빠른 개발 |
| 백엔드 | Express.js | 경량, 빠른 개발 |
| 데이터베이스 | MongoDB | 문서형, 유연한 스키마 |
| 호스팅 | Vercel (FE), 클라우드 (BE) | 초기 비용 최소화 |

---

## 프로젝트 구조

```
babmoa/
├── packages/
│   ├── client/              # Next.js 프론트엔드
│   │   ├── src/
│   │   │   ├── app/         # App Router 페이지
│   │   │   ├── components/  # 공통 컴포넌트
│   │   │   ├── lib/         # 유틸리티, API 클라이언트
│   │   │   └── types/       # TypeScript 타입
│   │   └── package.json
│   │
│   └── server/              # Express 백엔드
│       ├── src/
│       │   ├── controllers/ # API 핸들러
│       │   ├── models/      # MongoDB 스키마
│       │   ├── routes/      # 라우팅
│       │   ├── middlewares/ # 미들웨어
│       │   └── index.js     # 진입점
│       └── package.json
│
├── docs/                    # 프로젝트 문서
├── package.json             # npm workspaces
└── README.md
```

---

## API 엔드포인트

### 투표 관련
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/rooms` | 투표방 생성 |
| GET | `/api/rooms/:id` | 투표방 조회 |
| POST | `/api/rooms/:id/vote` | 투표하기 |
| GET | `/api/rooms/:id/results` | 투표 결과 조회 |

### 주차 데이터 관련
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/parking` | 주차 경험 기록 |
| GET | `/api/parking/:placeId/stats` | 장소별 주차 통계 |

### B2B API
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/b2b/parking/:placeId` | 주차 통계 조회 |
| GET | `/api/b2b/parking/bulk` | 다건 조회 |

---

## 외부 API

### 카카오맵 API
- **용도**: 장소 검색
- **호출 위치**: 서버에서만 호출
- **캐싱**: 지역 단위 캐싱, TTL 기반 갱신
- **비용 관리**: 동일 조건 재요청 시 캐시 사용

---

## 법적 리스크 관리

| 금지 사항 | 이유 |
|-----------|------|
| 지도 원본 데이터 저장/재판매 | 약관 위반 |
| 검색 결과 영구 저장 | 약관 위반 |

| 허용 사항 | 설명 |
|-----------|------|
| UX 개선용 캐싱 | 단기 TTL 적용 |
| 자체 수집 데이터 판매 | 주차/방문 결과만 |

---

## API 스키마 상세

### POST /api/parking - 주차 경험 기록
```javascript
// Request Body
{
  roomId: String,           // 투표방 ID
  placeId: String,          // 장소 ID
  participantId: String,    // 참여자 UUID
  parkingAvailable: Boolean,// 주차장 유무 (1단계 질문)
  parkingExperience: String // 주차 경험 (2단계 질문, parkingAvailable=true일 때만)
                            // "문제없음" | "조금불편" | "못함" | "모름"
}

// Response
{
  success: true,
  data: { recorded: true }
}
```

### GET /api/parking/:placeId/stats - 주차 통계
```javascript
// Response
{
  success: true,
  data: {
    placeId: String,
    totalAttempts: Number,
    successRate: Number,      // 0~1
    byTimeSlot: {
      "평일_점심": { attempts: N, successRate: 0.8 },
      "평일_저녁": { attempts: N, successRate: 0.6 },
      "주말": { attempts: N, successRate: 0.7 }
    }
  }
}
```

---

## 모델 구조

```
packages/server/src/models/
├── VoteRoom.js      # 투표방
├── Vote.js          # 개별 투표
├── ParkingData.js   # 주차 경험 (원본, TTL 1년)
└── ParkingStats.js  # 주차 통계 (집계본, B2B용)
```

---

## 비용 관리 전략

### 카카오맵 API 캐싱
| 캐시 대상 | TTL | 설명 |
|-----------|-----|------|
| 장소 검색 결과 | 24시간 | 지역+키워드 기준 |
| 장소 상세 정보 | 7일 | placeId 기준 |

- 동일 조건 재요청 시 캐시 우선 사용
- API 호출 횟수 ≠ 유저 수 (비례하지 않도록 설계)
