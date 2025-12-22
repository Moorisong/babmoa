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
        places: Array<{ placeId: string; name: string; address: string; category: string }>;
        options: { allowPass: boolean; deadline: string };
    }) => fetchApi<{ roomId: string }>('/rooms', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    get: (roomId: string) => fetchApi<{
        roomId: string;
        title: string;
        places: Array<{ placeId: string; name: string; address: string; category: string }>;
        options: { allowPass: boolean; deadline: string };
        result: { winnerPlaceId: string | null; decidedAt: string | null };
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
