import { API } from '@/constants';
import type {
    ApiResponse,
    KakaoPlace,
    ParkingInfo,
    ParkingStats,
    PlaceSearchOptions,
    PlaceSearchMeta,
    DistrictPlacesMeta,
    Room,
    VoteResult,
} from '@/types';

// 타입 re-export (하위 호환성)
export type { ParkingInfo, KakaoPlace, PlaceSearchOptions };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
    } catch {
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
    }) => fetchApi<{ roomId: string }>(API.ROOMS, {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    get: (roomId: string) => fetchApi<Room>(API.ROOM(roomId)),

    vote: (roomId: string, data: { placeId: string | null; participantId: string }) =>
        fetchApi<{ recorded: boolean }>(API.ROOM_VOTE(roomId), {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getResults: (roomId: string) => fetchApi<VoteResult>(API.ROOM_RESULTS(roomId)),
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
    }) => fetchApi<{ recorded: boolean }>(API.PARKING, {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    getStats: (placeId: string) => fetchApi<ParkingStats>(API.PARKING_STATS(placeId)),
};

// 장소 검색 API (카카오맵)
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
            meta: PlaceSearchMeta;
        }>(`${API.PLACES_SEARCH}?${params.toString()}`);
    },

    getCategories: () => fetchApi<{ categories: string[] }>(API.PLACES_CATEGORIES),

    getByDistrict: (district: string) => fetchApi<{
        places: KakaoPlace[];
        meta: DistrictPlacesMeta;
    }>(API.PLACES_DISTRICT(district)),
};
