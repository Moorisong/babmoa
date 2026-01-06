# MongoDB Data Archiving System

## 목적
- 초기 1~2년 동안 오래된 투표 데이터를 **같은 MongoDB 내에서 경량으로 보관**
- DB 용량 부담 최소화
- 장기 트렌드 분석 및 통계 검증 가능

## 대상 컬렉션 및 저장 필드

### VoteRoom
- **저장 컬렉션:** `ArchiveVoteRoom`
- **보관 필드:** `_id`, `title`, `places`, `options`, `result`, `createdAt`, `archivedAt`
- **제외 필드:** 참가자 상세 정보, 통계 집계용 데이터
- **이유:** 투표방 정보 유지, 장기 트렌드 분석

### Vote
- **저장 컬렉션:** `ArchiveVote`
- **보관 필드:** `_id`, `roomId`, `placeId`, `participantId`, `createdAt`, `archivedAt`
- **제외 필드:** 상세 참여 기록 필요 없음
- **이유:** 투표 집계 및 신뢰도 검증용

### ParkingData / ParkingStats
- **ParkingData:** 아카이빙 대상 아님 (TTL 1년 설정으로 자동 삭제)
- **ParkingStats:** 아카이빙 대상 아님 (영구 집계 데이터)

## 아카이빙 정책
- **주기:** 매월 1회 실행 권장
- **조건:** `createdAt < now - 1년` 인 데이터 (기본값)
- **방식:** 
  1. 오래된 데이터 조회
  2. 필요한 최소 필드만 추출하여 Archive 컬렉션에 `insertMany`
  3. 원본 컬렉션에서 `deleteMany` (옵션으로 유지 가능)

## 실행 방법

### CLI 스크립트 실행
```bash
# 기본 실행 (1년 이상 된 데이터 아카이빙 + 원본 삭제)
node packages/server/scripts/archive-data.js

# 원본 데이터 유지 (아카이빙만 수행)
node packages/server/scripts/archive-data.js --keep-original

# 기간 설정 (예: 2년 이상 된 데이터)
node packages/server/scripts/archive-data.js --years=2
```

## 유의사항
- 필드를 최소화하여 저장 용량을 절감합니다.
- 초기 데이터 규모 증가 시 AWS S3 등 외부 콜드 스토리지로 마이그레이션을 고려할 수 있습니다.
