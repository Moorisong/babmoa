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
| 1인 1표 | `participantId` + `roomId` 조합으로 중복 체크 |
| 투표 마감 후 결과 | 마감 전에는 결과 비공개 |
| 주차 기록은 마감 후만 | 투표 종료된 방에서만 기록 가능 |
| 데이터 TTL 1년 | `ParkingData`는 1년 후 자동 삭제 |

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
