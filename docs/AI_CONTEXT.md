# AI 컨텍스트

> 이 문서는 AI 코딩 어시스턴트가 프로젝트를 빠르게 이해할 수 있도록 작성되었습니다.

---

## 프로젝트 핵심

```
표면: 회식 장소 투표 도구
실체: 주차 데이터 수집 → B2B 판매
```

---

## 코드 작성 시 유의사항

### 1. 데이터 수집이 최우선
- 모든 UX 결정은 **"주차 데이터를 더 많이 수집할 수 있는가?"** 기준
- 사용자에게 강요하지 않되, 자연스럽게 유도

### 2. 로그인 없음
- 모든 기능은 **익명 참여 가능**
- 브라우저에서 UUID 생성하여 `participantId`로 사용
- 쿠키/로컬스토리지로 중복 투표 방지

### 3. 스키마 호환성
- 모든 문서에 `schemaVersion` 필드 포함
- 기존 필드 수정/삭제 금지
- 새 필드는 추가만 허용
- 읽을 때 기본값 처리

### 4. 외부 API 호출
- 카카오맵 API는 **서버에서만 호출**
- 클라이언트에서 직접 호출 금지
- 반드시 캐싱 적용

---

## 파일/폴더 네이밍

| 위치 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `VoteCard.tsx` |
| 페이지 | 폴더 기반 | `app/room/[id]/page.tsx` |
| API 라우트 | camelCase | `rooms.js` |
| 모델 | PascalCase | `VoteRoom.js` |
| 유틸리티 | camelCase | `generateId.ts` |

---

## 상태 관리

- 서버 상태: API 호출 + React Query 권장
- 클라이언트 상태: useState/useReducer
- 전역 상태: 최소화 (필요시 Context)

---

## 에러 처리

```javascript
// API 응답 형식
{
  success: true,
  data: { ... }
}

{
  success: false,
  error: {
    code: "VOTE_CLOSED",
    message: "투표가 마감되었습니다"
  }
}
```

---

## 주요 비즈니스 규칙

| 규칙 | 설명 |
|------|------|
| 투표방 생성 제한 | IP+participantId 1분 1개, IP만 1분 10개 초과 시 차단 |
| 1인 1표 | `participantId` + `roomId` 조합으로 중복 체크 |
| 투표 마감 후 결과 | 마감 전에는 결과 비공개 |
| 주차 기록은 마감 후만 | 투표 종료된 방에서만 기록 가능 |
| 데이터 TTL 1년 | `ParkingData`는 1년 후 자동 삭제 |

### 투표방 생성 제한 (2단계 보호)

**1단계: IP + participantId 조합**
- 같은 IP + 같은 participantId = 1분에 1개만 생성 가능
- 공용 IP 환경에서도 각 참여자별로 별도 제한

**2단계: IP 속도 기반 차단**
- 동일 IP에서 1분 내 10개 초과 → 악용 의심, 차단
- participantId 위조해도 IP 단위로 차단 가능

**클라이언트 보조**
- `lastCreatedRoomAt`: LocalStorage에 저장, 빠른 피드백

### 1인 1표 제한 방식

**브라우저 스토리지 기반 (UUID)** - MVP 기본 방식

1. 브라우저에서 최초 접근 시 UUID 생성 (`crypto.randomUUID()`)
2. LocalStorage에 영구 저장 (`babmoa_participant_id`)
3. 투표 참여 시 서버에 `participantId` 전달
4. 서버에서 `roomId + participantId` 조합으로 중복 체크 (Unique Index)

**한계**: 브라우저/디바이스를 바꾸면 중복 투표 가능 → MVP에서는 허용

---

## 브라우저 스토리지 정책

| 저장 항목 | 키 | TTL | 설명 |
|----------|-----|-----|------|
| 참여자 ID | `babmoa_participant_id` | **영구** | 1인 1표 식별용 |
| 투표 참여 기록 | `voted_{roomId}` | 14일 | 클라이언트 캐시 |
| 주차 기록 여부 | `parking_{roomId}` | 14일 | 클라이언트 캐시 |
| 투표방 생성 시각 | `lastCreatedRoomAt` | - | 1분 생성 제한용 |

- **StorageCleaner**: 앱 진입 시 자동으로 만료 데이터 정리 (`cleanOldStorage()`)
- `participantId`는 영구 보관 (정리 대상 제외)

---


## 개발 명령어

```bash
# 루트에서 실행
npm install              # 의존성 설치
npm run dev:client       # 프론트엔드 (localhost:3000)
npm run dev:server       # 백엔드 (localhost:5000)
```

---

## 참고 문서

| 문서 | 내용 |
|------|------|
| [PROJECT.md](./PROJECT.md) | 프로젝트 개요, 비즈니스 모델 |
| [UX_FLOW.md](./UX_FLOW.md) | 사용자 흐름, 페이지 구성 |
| [DATABASE.md](./DATABASE.md) | 스키마 설계, 데이터 전략 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 기술 스택, API 명세 |
| [MAP_INTEGRATION.md](./MAP_INTEGRATION.md) | 지도 통합, 주차 뱃지 UI |

---

## 주의사항

### UUID 기반 익명 참여 한계
- 브라우저별/디바이스별로 다른 UUID 생성됨
- 동일 사용자가 다른 브라우저로 중복 투표 가능 (완벽한 방지 불가)
- MVP에서는 허용, 추후 필요시 전화번호 인증 등 추가 검토

### 데이터 보관 정책
| 컬렉션 | TTL | 비고 |
|--------|-----|------|
| VoteRoom | 없음 | 영구 보관 |
| Vote | 없음 | 영구 보관 |
| ParkingData | 1년 | 자동 삭제 |
| ParkingStats | 없음 | 집계본 영구 보관 |
