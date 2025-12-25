// 라우트 경로 상수
// 컨벤션: 2회 이상 사용되는 라우트 경로는 반드시 상수로 관리

export const ROUTES = {
    HOME: '/',
    ROOM: (id: string) => `/room/${id}`,
    ROOM_RESULT: (id: string) => `/room/${id}/result`,
    ROOM_PARKING: (id: string) => `/room/${id}/parking`,
    PRIVACY: '/privacy',
    TERMS: '/terms',
} as const;
