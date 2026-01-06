const { isCoreRegion } = require('../services/regionService');

/**
 * Region Guard 미들웨어
 * 
 * [!IMPORTANT] 모든 주차 통계 관련 API는 이 Guard를 반드시 거쳐야 한다.
 * 
 * CORE_REGION이 아닌 경우:
 * - successRate, stats, badges 등의 필드를 API 응답에서 완전히 제거
 * - null이 아닌 삭제 처리
 * 
 * regionId 결정 우선순위:
 * 1. DB에 저장된 regionId (우선)
 * 2. 카카오맵 API address.region_2depth_name (fallback)
 */

/**
 * 주차 통계 응답에서 비노출 지역 필드 제거
 * @param {Object} data 응답 데이터
 * @param {string} regionId 지역 ID
 * @returns {Promise<Object>} 필터링된 데이터
 */
async function filterParkingStats(data, regionId) {
    const isCore = await isCoreRegion(regionId);

    if (isCore) {
        // CORE_REGION: 모든 데이터 반환
        return data;
    }

    // OPEN/CANDIDATE: 통계 필드 완전 제거
    if (data === null || data === undefined) {
        return data;
    }

    // 객체인 경우 통계 필드 제거
    if (typeof data === 'object' && !Array.isArray(data)) {
        const filtered = { ...data };

        // 제거할 필드 목록
        const fieldsToRemove = [
            'successRate',
            'totalAttempts',
            'byTimeSlot',
            'successCount',
            'partialCount',
            'failCount',
            'unknownCount',
            'stats',
            'badges',
            'parkingStats'
        ];

        fieldsToRemove.forEach(field => {
            delete filtered[field];
        });

        return filtered;
    }

    // 배열인 경우 각 항목 필터링
    if (Array.isArray(data)) {
        return Promise.all(data.map(item => filterParkingStats(item, regionId)));
    }

    return data;
}

/**
 * 단일 장소 통계 응답 처리
 * @param {Object} statsData 통계 데이터
 * @param {string} regionId 지역 ID
 * @returns {Promise<Object|null>}
 */
async function guardSinglePlaceStats(statsData, regionId) {
    const isCore = await isCoreRegion(regionId);

    if (!isCore) {
        // CORE가 아니면 기본 정보만 반환 (통계 제외)
        return {
            placeId: statsData?.placeId,
            regionStatus: 'COLLECTING'  // 데이터 수집 중 상태 표시용
        };
    }

    return {
        ...statsData,
        regionStatus: 'AVAILABLE'
    };
}

/**
 * 다건 장소 통계 응답 처리
 * @param {Array} statsArray 통계 데이터 배열
 * @param {Function} getRegionIdFn placeId로 regionId를 조회하는 함수
 * @returns {Promise<Array>}
 */
async function guardBulkPlaceStats(statsArray, getRegionIdFn) {
    const results = [];

    for (const stats of statsArray) {
        const regionId = await getRegionIdFn(stats.placeId);
        const guarded = await guardSinglePlaceStats(stats, regionId);
        results.push(guarded);
    }

    return results;
}

module.exports = {
    filterParkingStats,
    guardSinglePlaceStats,
    guardBulkPlaceStats
};
