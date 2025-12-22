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
