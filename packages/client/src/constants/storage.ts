// LocalStorage 키 상수
// 컨벤션: 스토리지 키는 반드시 상수로 관리

export const STORAGE_KEYS = {
    PARTICIPANT_ID: 'babmoa_participant_id',
    VOTED: (roomId: string) => `voted_${roomId}`,
    PARKING: (roomId: string) => `parking_${roomId}`,
    LAST_CREATED_ROOM_AT: 'lastCreatedRoomAt',
} as const;
