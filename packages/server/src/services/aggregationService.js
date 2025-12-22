const { ParkingData, ParkingStats } = require('../models');

/**
 * 주차 데이터 집계 서비스
 * - 최근 30일 가중치 적용
 * - 시간대별/장소별 분리 집계
 */

/**
 * 가중치 계산
 * 최근 데이터일수록 높은 가중치 (0~1)
 * 가중치 = 1 - (현재일 - 기록일) / 30
 */
function calculateWeight(recordDate) {
    const now = new Date();
    const record = new Date(recordDate);
    const daysDiff = (now - record) / (1000 * 60 * 60 * 24);

    if (daysDiff > 30) return 0;
    return Math.max(0, 1 - daysDiff / 30);
}

/**
 * 장소+시간대별 가중치 적용 통계 재계산
 * @param {string} placeId 
 * @param {string} timeSlot 
 */
async function recalculateStats(placeId, timeSlot) {
    // 최근 1년 데이터 조회 (TTL 1년이므로 전체 데이터)
    const parkingRecords = await ParkingData.find({
        placeId,
        timeSlot,
        parkingAvailable: true  // 주차장 있는 경우만 집계
    }).sort({ createdAt: -1 });

    if (parkingRecords.length === 0) {
        return null;
    }

    // 가중치 적용 집계
    let totalWeight = 0;
    let weightedSuccess = 0;
    let weightedPartial = 0;
    let weightedFail = 0;
    let weightedUnknown = 0;

    // 단순 카운트 (가중치 미적용)
    let successCount = 0;
    let partialCount = 0;
    let failCount = 0;
    let unknownCount = 0;

    parkingRecords.forEach(record => {
        const weight = calculateWeight(record.createdAt);
        totalWeight += weight;

        switch (record.parkingExperience) {
            case '문제없음':
                successCount++;
                weightedSuccess += weight;
                break;
            case '조금불편':
                partialCount++;
                weightedPartial += weight;
                break;
            case '못함':
                failCount++;
                weightedFail += weight;
                break;
            case '모름':
            default:
                unknownCount++;
                weightedUnknown += weight;
                break;
        }
    });

    // 가중치 적용 성공률 계산
    // unknownCount 제외, partialCount는 0.5 가중치
    const effectiveWeight = totalWeight - weightedUnknown;
    let successRate = 0;

    if (effectiveWeight > 0) {
        successRate = (weightedSuccess + weightedPartial * 0.5) / effectiveWeight;
    }

    // 통계 업데이트
    const stats = await ParkingStats.findOneAndUpdate(
        { placeId, timeSlot },
        {
            placeId,
            timeSlot,
            totalAttempts: parkingRecords.length,
            successCount,
            partialCount,
            failCount,
            unknownCount,
            successRate: Math.round(successRate * 1000) / 1000,  // 소수점 3자리
            lastUpdated: new Date()
        },
        { upsert: true, new: true }
    );

    return stats;
}

/**
 * 새 주차 데이터 기록 시 통계 업데이트
 * @param {Object} parkingData 저장된 ParkingData 문서
 */
async function updateStatsOnNewRecord(parkingData) {
    // 주차장 없는 경우 집계 제외
    if (!parkingData.parkingAvailable) {
        return null;
    }

    return await recalculateStats(parkingData.placeId, parkingData.timeSlot);
}

/**
 * 모든 장소+시간대 통계 재계산 (배치용)
 */
async function recalculateAllStats() {
    // 모든 고유한 placeId + timeSlot 조합 조회
    const combinations = await ParkingData.aggregate([
        { $match: { parkingAvailable: true } },
        { $group: { _id: { placeId: '$placeId', timeSlot: '$timeSlot' } } }
    ]);

    const results = [];
    for (const combo of combinations) {
        const stats = await recalculateStats(combo._id.placeId, combo._id.timeSlot);
        if (stats) results.push(stats);
    }

    return results;
}

module.exports = {
    calculateWeight,
    recalculateStats,
    updateStatsOnNewRecord,
    recalculateAllStats
};
