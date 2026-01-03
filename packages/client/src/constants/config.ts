// 설정값 상수
// 컨벤션: 매직 넘버는 반드시 상수로 관리

export const CONFIG = {
    /** 스토리지 만료 일수 (일) */
    STORAGE_EXPIRY_DAYS: 14,

    /** 투표방 생성 쿨다운 (밀리초) - 1분 */
    ROOM_CREATION_COOLDOWN_MS: 60 * 1000,

    /** 지원하는 지역 목록 */
    SUPPORTED_DISTRICTS: ['대구시', '경산시'] as const,

    /** 투표방 생성 시 최소 장소 수 */
    MIN_PLACES_FOR_ROOM: 2,

    /** 주차 통계 표시 최소 기록 수 */
    MIN_PARKING_RECORDS: 3,

    /** 토스트 표시 시간 (밀리초) */
    TOAST_DURATION_MS: 3000,
} as const;

export type District = (typeof CONFIG.SUPPORTED_DISTRICTS)[number];
