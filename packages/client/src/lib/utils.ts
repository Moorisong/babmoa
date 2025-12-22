// 브라우저 UUID 생성 및 저장
const PARTICIPANT_ID_KEY = 'babmoa_participant_id';

export function getParticipantId(): string {
    if (typeof window === 'undefined') {
        return '';
    }

    let participantId = localStorage.getItem(PARTICIPANT_ID_KEY);

    if (!participantId) {
        participantId = crypto.randomUUID();
        localStorage.setItem(PARTICIPANT_ID_KEY, participantId);
    }

    return participantId;
}

// 투표 여부 확인
export function hasVoted(roomId: string): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`voted_${roomId}`) === 'true';
}

export function setVoted(roomId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`voted_${roomId}`, 'true');
}

// 주차 기록 여부 확인
export function hasRecordedParking(roomId: string): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`parking_${roomId}`) === 'true';
}

export function setRecordedParking(roomId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`parking_${roomId}`, 'true');
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
