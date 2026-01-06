// 공통 타입 정의
// 컨벤션: 타입/인터페이스는 PascalCase

// ========================================
// 장소 관련 타입
// ========================================

export interface ParkingInfo {
    parkingAvailable: boolean | null;
    successRate: number | null;
    recordCount: number;
    timeSlot: TimeSlot;
    hasEnoughData: boolean;
}

// 지역 상태: OPEN(수집 전) → CANDIDATE(수집 중) → CORE(공개)
export type RegionStatus = 'OPEN' | 'CANDIDATE' | 'CORE';

export interface Place {
    placeId: string;
    name: string;
    address: string;
    category: string;
    categoryDetail?: string;
    x?: string;
    y?: string;
    parkingInfo?: ParkingInfo | null;
}

export interface KakaoPlace extends Place {
    phone: string;
    x: string;
    y: string;
    regionStatus?: RegionStatus;  // 지역 상태 (OPEN/CANDIDATE/CORE)
}

// ========================================
// 투표방 관련 타입
// ========================================

export interface RoomOptions {
    allowPass: boolean;
    deadline: string;
}

export interface RoomResult {
    winnerPlaceId: string | null;
    decidedAt: string | null;
}

export interface Room {
    roomId: string;
    title: string;
    places: Place[];
    options: RoomOptions;
    result: RoomResult;
    isClosed?: boolean;
    createdAt?: string;
    totalVotes?: number;  // 투표 참여자 수
    creatorParticipantId?: string | null;  // 생성자 ID
}

export interface VoteResult {
    winnerPlaceId: string | null;
    votes: Array<{ placeId: string | null; count: number }>;
}

// ========================================
// API 응답 타입
// ========================================

export interface ApiError {
    code: string;
    message: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
}

// ========================================
// 주차 관련 타입
// ========================================

export type TimeSlot = '평일_점심' | '평일_저녁' | '주말';

export type ParkingExperience = '문제없음' | '조금불편' | '못함' | '모름';

export interface ParkingRecord {
    roomId: string;
    placeId: string;
    participantId: string;
    parkingAvailable: boolean;
    parkingExperience: ParkingExperience | null;
    date: string;
    timeSlot: TimeSlot;
}

export interface ParkingStats {
    placeId: string;
    totalAttempts: number;
    successRate: number;
    byTimeSlot: Record<string, { attempts: number; successRate: number }>;
}

// ========================================
// 검색 관련 타입
// ========================================

export interface PlaceSearchOptions {
    x?: string;
    y?: string;
    radius?: number;
    page?: number;
    size?: number;
    category?: string;
    shuffle?: boolean;
}

export interface PlaceSearchMeta {
    totalCount: number;
    isEnd: boolean;
    currentPage: number;
    currentTimeSlot?: string;
}

export interface DistrictPlacesMeta {
    totalCount: number;
    district: string;
    currentTimeSlot?: string;
}
