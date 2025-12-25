# 데이터 설계

## 데이터베이스
- **MongoDB** (문서형 DB)
- 관계형 DB 사용하지 않음

---

## 컬렉션 스키마

### VoteRoom (투표방)
```javascript
{
  _id: ObjectId,
  schemaVersion: 1,           // 스키마 버전 관리
  title: String,              // "12월 송년회 장소"
  places: [{
    placeId: String,          // 카카오 장소 ID
    name: String,             // "맛있는 고기집"
    address: String,          // "서울 강남구 ..."
    category: String          // "한식"
  }],
  options: {
    allowPass: Boolean,       // "상관없음" 옵션 허용
    deadline: Date            // 투표 마감 시간
  },
  result: {
    winnerPlaceId: String,    // 확정 장소 ID
    decidedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Vote (투표)
```javascript
{
  _id: ObjectId,
  schemaVersion: 1,
  roomId: ObjectId,           // VoteRoom 참조
  placeId: String,            // 선택한 장소 ID (null이면 패스)
  participantId: String,      // 익명 UUID (브라우저 생성)
  createdAt: Date
}
// Index: { roomId: 1, participantId: 1 } (unique) - 1인 1표 보장
```


### ParkingData (주차 경험)
```javascript
{
  _id: ObjectId,
  schemaVersion: 1,
  placeId: String,            // 카카오 장소 ID
  roomId: ObjectId,           // 어느 투표에서 왔는지
  date: Date,                 // 방문 날짜
  timeSlot: String,           // "평일_점심" | "평일_저녁" | "주말"
  parkingAvailable: Boolean,  // 주차장 유무
  parkingExperience: String,  // "문제없음" | "조금불편" | "못함" | "모름"
  participantId: String,      // 기록자 UUID
  createdAt: {
    type: Date,
    expires: 31536000         // TTL: 1년 후 자동 삭제
  }
}
```

### ParkingStats (집계 데이터 - B2B용)
```javascript
{
  _id: ObjectId,
  placeId: String,
  timeSlot: String,
  totalAttempts: Number,      // 총 시도 횟수
  successCount: Number,       // 성공 횟수 (문제없음)
  partialCount: Number,       // 부분 성공 (조금불편)
  failCount: Number,          // 실패 (못함)
  unknownCount: Number,       // 모름
  successRate: Number,        // 성공률 (0~1)
  lastUpdated: Date
}
```

### IpRateLimit (Rate Limiting)
```javascript
{
  _id: ObjectId,
  ip: String,                 // 클라이언트 IP
  participantId: String,      // 브라우저 UUID
  action: String,             // 'room_create'
  createdAt: {
    type: Date,
    expires: 259200           // TTL: 3일 후 자동 삭제
  }
}
// Index: { ip: 1, participantId: 1, action: 1, createdAt: -1 } - 개인별 조회
// Index: { ip: 1, action: 1, createdAt: -1 } - IP 속도 기반 차단
```

---

## 스키마 관리 원칙

| 원칙 | 설명 |
|------|------|
| 버전 명시 | 문서마다 `schemaVersion` 필드 |
| 필드 추가만 허용 | 기존 필드 변경/삭제 금지 |
| 기본값 처리 | 읽을 때 없는 필드는 기본값 적용 |
| 마이그레이션 지양 | 대규모 일괄 변환 하지 않음 |

---

## 데이터 수명 관리

| 데이터 | 보관 기간 | 처리 |
|--------|----------|------|
| VoteRoom | 영구 | - |
| Vote | 영구 | - |
| ParkingData | 1년 | TTL 자동 삭제 |
| ParkingStats | 영구 | 집계본 보관 |

---

## 데이터 신뢰도 전략

1. **단일 기록**: 참고용
2. **다수 기록 누적**: 신뢰도 상승
3. **최근 기록 가중치 ↑**
4. **시간대/요일별 분리 관리**
5. **결과 표현**: "주차 가능 여부"가 아닌 **"주차 성공 확률"**

---

## 악성 데이터 대응

- 투표 종료 후에만 기록 허용
- 동일 투표 내 중복 기록 제한
- 비정상 클릭 패턴 자동 감지
- 신뢰도 낮은 데이터는 집계 제외

---

## 보관 정책 명시

| 컬렉션 | TTL | 설명 |
|--------|-----|------|
| VoteRoom | 없음 | 영구 보관 |
| Vote | 없음 | 영구 보관 |
| ParkingData | 1년 | TTL 인덱스로 자동 삭제 |
| ParkingStats | 없음 | 집계본 영구 보관 |
| IpRateLimit | 3일 | TTL 인덱스로 자동 삭제 |

---

## 구현 주의사항

| 항목 | 주의 |
|------|------|
| TTL 삭제 | 정확히 1년 후가 아닌 최소 60초 지연 가능 |
| parkingExperience | `parkingAvailable=false`이면 `null` 처리 |
| successRate 가중치 | 스키마 아닌 집계 로직에서 최근 데이터 가중치 적용 |

---

## isClosed 필드 (v1.1 추가)

| 필드 | 타입 | 설명 |
|------|------|------|
| `isClosed` | Boolean | 자동 마감 여부, 기본값 false |

**동작 원리**:
- API 호출 시 `deadline <= 현재시간` 확인
- 조건 충족 시 `isClosed = true` 자동 설정
- 이후 deadline 비교 없이 `isClosed`로 빠른 판단
