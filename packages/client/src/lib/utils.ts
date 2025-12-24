// 브라우저 UUID 생성 및 저장
// participantId는 영구 보관 (TTL 없음)
const PARTICIPANT_ID_KEY = 'babmoa_participant_id';

export function getParticipantId(): string {
    if (typeof window === 'undefined') {
        return '';
    }

    // 영구 저장된 participantId 조회
    let participantId = getParticipantIdFromStorage();

    if (!participantId) {
        participantId = crypto.randomUUID();
        setParticipantIdToStorage(participantId);
    }

    return participantId;
}

// participantId 영구 저장 (TTL 없음)
function setParticipantIdToStorage(value: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PARTICIPANT_ID_KEY, value);
}

// participantId 조회 (영구 저장 - TTL 체크 없음)
function getParticipantIdFromStorage(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(PARTICIPANT_ID_KEY);
}

const STORAGE_EXPIRY_DAYS = 14;

interface StoredData {
    value: string;
    timestamp: number;
}

function setItemWithExpiry(key: string, value: string) {
    if (typeof window === 'undefined') return;
    const data: StoredData = {
        value,
        timestamp: new Date().getTime(),
    };
    localStorage.setItem(key, JSON.stringify(data));
}

function getItemWithExpiry(key: string): string | null {
    if (typeof window === 'undefined') return null;
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    try {
        const item: StoredData = JSON.parse(itemStr);
        // 하위 호환성: 예전 데이터가 단순 문자열('true')인 경우
        if (typeof item === 'string') return item;

        // 만료 체크
        const now = new Date().getTime();
        const expiryTime = STORAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        if (now - item.timestamp > expiryTime) {
            localStorage.removeItem(key);
            return null;
        }
        return item.value;
    } catch {
        // 파싱 에러나면 그냥 문자열로 취급 (하위 호환)
        return itemStr;
    }
}

// 오래된 데이터 정리 (앱 진입 시 실행 권장)
// 주의: participantId는 영구 보관이므로 정리 대상에서 제외
export function cleanOldStorage() {
    if (typeof window === 'undefined') return;

    const now = new Date().getTime();
    const expiryTime = STORAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    Object.keys(localStorage).forEach(key => {
        // voted_, parking_ 프리픽스만 정리 (participantId는 영구 보관)
        if (key.startsWith('voted_') || key.startsWith('parking_')) {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return;

            try {
                const item = JSON.parse(itemStr);
                if (item && item.timestamp && (now - item.timestamp > expiryTime)) {
                    localStorage.removeItem(key);
                    console.log(`Cleaned up expired storage: ${key}`);
                }
            } catch {
                // 예전 데이터 형식이면 무시하거나 삭제 정책 결정 가능
                // 현재는 유지
            }
        }
    });
}

// 투표 여부 확인
export function hasVoted(roomId: string): boolean {
    return getItemWithExpiry(`voted_${roomId}`) === 'true';
}

export function setVoted(roomId: string): void {
    setItemWithExpiry(`voted_${roomId}`, 'true');
}

// 주차 기록 여부 확인
export function hasRecordedParking(roomId: string): boolean {
    return getItemWithExpiry(`parking_${roomId}`) === 'true';
}

export function setRecordedParking(roomId: string): void {
    setItemWithExpiry(`parking_${roomId}`, 'true');
}

// 투표방 생성 제한 (1분 간격)
const LAST_CREATED_ROOM_KEY = 'lastCreatedRoomAt';
const ROOM_CREATION_COOLDOWN_MS = 60 * 1000; // 1분

/**
 * 투표방 생성 가능 여부 확인
 * @returns 생성 가능하면 true, 제한 중이면 false
 */
export function canCreateRoom(): boolean {
    if (typeof window === 'undefined') return true;

    const lastCreatedAt = localStorage.getItem(LAST_CREATED_ROOM_KEY);
    if (!lastCreatedAt) return true;

    const elapsed = Date.now() - parseInt(lastCreatedAt, 10);
    return elapsed >= ROOM_CREATION_COOLDOWN_MS;
}

/**
 * 투표방 생성까지 남은 시간 (초)
 * @returns 남은 초, 제한 없으면 0
 */
export function getRoomCreationCooldownRemaining(): number {
    if (typeof window === 'undefined') return 0;

    const lastCreatedAt = localStorage.getItem(LAST_CREATED_ROOM_KEY);
    if (!lastCreatedAt) return 0;

    const elapsed = Date.now() - parseInt(lastCreatedAt, 10);
    const remaining = ROOM_CREATION_COOLDOWN_MS - elapsed;

    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * 투표방 생성 시각 기록 (생성 성공 후 호출)
 */
export function setRoomCreatedAt(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LAST_CREATED_ROOM_KEY, Date.now().toString());
}

// 시간대 계산 (현재 시간 기준)
export function getTimeSlot(): '평일_점심' | '평일_저녁' | '주말' {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    // 주말 (토, 일)
    if (day === 0 || day === 6) {
        return '주말';
    }

    // 평일 저녁 (18시 이후)
    if (hour >= 18) {
        return '평일_저녁';
    }

    // 평일 점심
    return '평일_점심';
}

// 시간대 계산 (투표 마감 시간 기준) - 더 정확한 기본값
export function getTimeSlotFromDeadline(deadline: string): '평일_점심' | '평일_저녁' | '주말' {
    const deadlineDate = new Date(deadline);
    const day = deadlineDate.getDay();
    const hour = deadlineDate.getHours();

    // 주말 (토, 일)
    if (day === 0 || day === 6) {
        return '주말';
    }

    // 저녁 (17시 이후)
    if (hour >= 17) {
        return '평일_저녁';
    }

    // 점심 (11시~14시) 또는 오후
    return '평일_점심';
}

// 날짜 포맷
export function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

// 마감 시간까지 남은 시간
export function getTimeRemaining(deadline: string): string {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return '마감됨';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days}일 남음`;
    }

    if (hours > 0) {
        return `${hours}시간 ${minutes}분 남음`;
    }

    if (minutes > 0) {
        return `${minutes}분 ${seconds}초 남음`;
    }

    return `${seconds}초 남음`;
}
