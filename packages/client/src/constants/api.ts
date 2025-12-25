// API 경로 상수
// 컨벤션: 2회 이상 사용되는 API 경로는 반드시 상수로 관리

export const API = {
    ROOMS: '/rooms',
    ROOM: (id: string) => `/rooms/${id}`,
    ROOM_VOTE: (id: string) => `/rooms/${id}/vote`,
    ROOM_RESULTS: (id: string) => `/rooms/${id}/results`,
    PARKING: '/parking',
    PARKING_STATS: (placeId: string) => `/parking/${placeId}/stats`,
    PLACES_SEARCH: '/places/search',
    PLACES_CATEGORIES: '/places/categories',
    PLACES_DISTRICT: (district: string) => `/places/district/${encodeURIComponent(district)}`,
} as const;
