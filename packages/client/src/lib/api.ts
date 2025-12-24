const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            error: { code: 'NETWORK_ERROR', message: '네트워크 오류가 발생했습니다' },
        };
    }
}

// 투표방 API
export const roomsApi = {
    create: (data: {
        title: string;
        places: Array<{ placeId: string; name: string; address: string; category: string; categoryDetail?: string }>;
        options: { allowPass: boolean; deadline: string };
        participantId: string;
    }) => fetchApi<{ roomId: string }>('/rooms', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    get: (roomId: string) => fetchApi<{
        roomId: string;
        title: string;
        places: Array<{ placeId: string; name: string; address: string; category: string; categoryDetail?: string }>;
        options: { allowPass: boolean; deadline: string };
        result: { winnerPlaceId: string | null; decidedAt: string | null };
        isClosed: boolean;
        createdAt: string;
    }>(`/rooms/${roomId}`),

    vote: (roomId: string, data: { placeId: string | null; participantId: string }) =>
        fetchApi<{ recorded: boolean }>(`/rooms/${roomId}/vote`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getResults: (roomId: string) => fetchApi<{
        winnerPlaceId: string | null;
        votes: Array<{ placeId: string | null; count: number }>;
    }>(`/rooms/${roomId}/results`),
};

// 주차 데이터 API
export const parkingApi = {
    record: (data: {
        roomId: string;
        placeId: string;
        participantId: string;
        parkingAvailable: boolean;
        parkingExperience: string | null;
        date: string;
        timeSlot: string;
    }) => fetchApi<{ recorded: boolean }>('/parking', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    getStats: (placeId: string) => fetchApi<{
        placeId: string;
        totalAttempts: number;
        successRate: number;
        byTimeSlot: Record<string, { attempts: number; successRate: number }>;
    }>(`/parking/${placeId}/stats`),
};

// 장소 검색 API (카카오맵)
export interface ParkingInfo {
    parkingAvailable: boolean | null;
    successRate: number | null;
    recordCount: number;
    timeSlot: '평일_점심' | '평일_저녁' | '주말';
    hasEnoughData: boolean;
}

export interface KakaoPlace {
    placeId: string;
    name: string;
    address: string;
    category: string;
    categoryDetail?: string;
    phone: string;
    x: string;
    y: string;
    parkingInfo?: ParkingInfo | null;
}

export interface PlaceSearchOptions {
    x?: string;
    y?: string;
    radius?: number;
    page?: number;
    size?: number;
    category?: string;
    shuffle?: boolean;
}

export const placesApi = {
    search: (keyword: string, options?: PlaceSearchOptions) => {
        const params = new URLSearchParams();
        params.append('keyword', keyword);
        if (options?.x) params.append('x', options.x);
        if (options?.y) params.append('y', options.y);
        if (options?.radius) params.append('radius', String(options.radius));
        if (options?.page) params.append('page', String(options.page));
        if (options?.size) params.append('size', String(options.size));
        if (options?.category) params.append('category', options.category);
        if (options?.shuffle) params.append('shuffle', 'true');

        return fetchApi<{
            places: KakaoPlace[];
            meta: { totalCount: number; isEnd: boolean; currentPage: number; currentTimeSlot?: string };
        }>(`/places/search?${params.toString()}`);
    },

    getCategories: () => fetchApi<{ categories: string[] }>('/places/categories'),

    getByDistrict: (district: string) => fetchApi<{
        places: KakaoPlace[];
        meta: { totalCount: number; district: string; currentTimeSlot?: string };
    }>(`/places/district/${encodeURIComponent(district)}`),
};
