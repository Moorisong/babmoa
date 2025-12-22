import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsApi, parkingApi } from './api';

// ========================================
// Query Keys
// ========================================
export const queryKeys = {
    voteRoom: (roomId: string) => ['voteRoom', roomId] as const,
    voteResult: (roomId: string) => ['voteResult', roomId] as const,
    parkingStats: (placeId: string) => ['parkingStats', placeId] as const,
};

// ========================================
// 투표방 관련 Hooks
// ========================================

/**
 * 투표방 조회
 * staleTime: 5분, cacheTime: 30분
 */
export function useVoteRoom(roomId: string) {
    return useQuery({
        queryKey: queryKeys.voteRoom(roomId),
        queryFn: async () => {
            const result = await roomsApi.get(roomId);
            if (!result.success) {
                throw new Error(result.error?.message || '투표방 조회 실패');
            }
            return result.data;
        },
        staleTime: 5 * 60 * 1000,  // 5분
        gcTime: 30 * 60 * 1000,    // 30분
        enabled: !!roomId,
    });
}

/**
 * 투표 결과 조회
 * staleTime: 1분, cacheTime: 30분
 */
export function useVoteResult(roomId: string, enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.voteResult(roomId),
        queryFn: async () => {
            const result = await roomsApi.getResults(roomId);
            if (!result.success) {
                throw new Error(result.error?.message || '결과 조회 실패');
            }
            return result.data;
        },
        staleTime: 1 * 60 * 1000,  // 1분
        gcTime: 30 * 60 * 1000,    // 30분
        enabled: enabled && !!roomId,
        refetchInterval: 30 * 1000,  // 30초마다 갱신 (결과 페이지)
    });
}

/**
 * 투표방 생성
 */
export function useCreateRoom() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: roomsApi.create,
        onSuccess: (data) => {
            if (data.success && data.data) {
                // 생성된 투표방 캐시에 추가
                queryClient.invalidateQueries({ queryKey: ['voteRoom'] });
            }
        },
    });
}

/**
 * 투표하기
 */
export function useVote(roomId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { placeId: string | null; participantId: string }) =>
            roomsApi.vote(roomId, data),
        onSuccess: () => {
            // 투표 후 결과 캐시 무효화
            queryClient.invalidateQueries({ queryKey: queryKeys.voteResult(roomId) });
        },
    });
}

// ========================================
// 주차 데이터 관련 Hooks
// ========================================

/**
 * 주차 통계 조회
 * staleTime: 10분, cacheTime: 1시간
 */
export function useParkingStats(placeId: string, enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.parkingStats(placeId),
        queryFn: async () => {
            const result = await parkingApi.getStats(placeId);
            if (!result.success) {
                throw new Error(result.error?.message || '통계 조회 실패');
            }
            return result.data;
        },
        staleTime: 10 * 60 * 1000,  // 10분
        gcTime: 60 * 60 * 1000,     // 1시간
        enabled: enabled && !!placeId,
    });
}

/**
 * 주차 경험 기록
 */
export function useRecordParking() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: parkingApi.record,
        onSuccess: (data, variables) => {
            if (data.success) {
                // 기록 후 통계 캐시 무효화
                queryClient.invalidateQueries({
                    queryKey: queryKeys.parkingStats(variables.placeId),
                });
            }
        },
    });
}
