const { RegionState, ParkingData } = require('../models');

/**
 * 지역 상태 서비스
 * - 지역 상태 조회
 * - 자동 승격 로직 (1일 1회 배치)
 * 
 * 승격 조건:
 * - totalRecords >= 120
 * - uniqueParticipants >= 40
 * - timeSlotCount >= 3
 * - daysSinceFirstRecord >= 30
 */

const PROMOTION_THRESHOLDS = {
    totalRecords: 300,
    uniqueParticipants: 80,
    timeSlotCount: 3,
    daysSinceFirstRecord: 60
};

/**
 * 지역 상태 조회
 * @param {string} regionId 행정구역 ID
 * @returns {Promise<string>} 'OPEN' | 'CANDIDATE' | 'CORE'
 */
async function getRegionStatus(regionId) {
    if (!regionId) return 'OPEN';

    const region = await RegionState.findOne({ regionId });
    return region?.status || 'OPEN';
}

/**
 * CORE 지역 여부 확인
 * @param {string} regionId 행정구역 ID
 * @returns {Promise<boolean>}
 */
async function isCoreRegion(regionId) {
    const status = await getRegionStatus(regionId);
    return status === 'CORE';
}

/**
 * 특정 지역의 지표 집계
 * @param {string} regionId 행정구역 ID
 */
async function aggregateRegionMetrics(regionId) {
    // 해당 지역의 ParkingData 집계
    const aggregation = await ParkingData.aggregate([
        { $match: { regionId } },
        {
            $group: {
                _id: null,
                totalParkingRecords: { $sum: 1 },
                uniqueParticipants: { $addToSet: '$participantId' },
                timeSlots: { $addToSet: '$timeSlot' },
                firstRecordedAt: { $min: '$createdAt' },
                lastRecordedAt: { $max: '$createdAt' }
            }
        }
    ]);

    if (aggregation.length === 0) {
        return null;
    }

    const result = aggregation[0];
    return {
        totalParkingRecords: result.totalParkingRecords,
        uniqueParticipants: result.uniqueParticipants.length,
        timeSlotDistribution: result.timeSlots.length,
        firstRecordedAt: result.firstRecordedAt,
        lastRecordedAt: result.lastRecordedAt
    };
}

/**
 * 승격 조건 충족 여부 확인
 * @param {Object} metrics 집계된 지표
 * @returns {boolean}
 */
function meetsPromotionCriteria(metrics) {
    if (!metrics || !metrics.firstRecordedAt) return false;

    const daysSinceFirst = Math.floor(
        (new Date() - new Date(metrics.firstRecordedAt)) / (1000 * 60 * 60 * 24)
    );

    return (
        metrics.totalParkingRecords >= PROMOTION_THRESHOLDS.totalRecords &&
        metrics.uniqueParticipants >= PROMOTION_THRESHOLDS.uniqueParticipants &&
        metrics.timeSlotDistribution >= PROMOTION_THRESHOLDS.timeSlotCount &&
        daysSinceFirst >= PROMOTION_THRESHOLDS.daysSinceFirstRecord
    );
}

/**
 * 1일 1회 배치 작업: 모든 지역 집계 및 자동 승격 (OPEN -> CANDIDATE)
 * @returns {Promise<Array>} 승격된 지역 목록
 */
async function runRegionAggregation() {
    console.log('[RegionService] Starting region aggregation batch...');

    // 모든 고유한 regionId 조회
    const regions = await ParkingData.distinct('regionId');
    const promotedRegions = [];

    for (const regionId of regions) {
        if (!regionId) continue;

        try {
            // 지표 집계
            const metrics = await aggregateRegionMetrics(regionId);
            if (!metrics) continue;

            // RegionState 업데이트 또는 생성
            const regionState = await RegionState.findOneAndUpdate(
                { regionId },
                {
                    regionId,
                    metrics,
                    lastAggregatedAt: new Date()
                },
                { upsert: true, new: true }
            );

            // 이미 CORE거나 CANDIDATE면 스킵 (자동 승격은 OPEN -> CANDIDATE만 수행)
            // * CORE 승격은 운영자 수동 결정
            if (regionState.status !== 'OPEN') continue;

            // 승격 조건 확인
            if (meetsPromotionCriteria(metrics)) {
                // CANDIDATE로 승격
                regionState.status = 'CANDIDATE';
                regionState.promotedAt = new Date();
                await regionState.save();

                // Promotion Audit Log
                console.log('[RegionService] PROMOTION AUDIT LOG (OPEN -> CANDIDATE):', {
                    regionId,
                    promotedAt: regionState.promotedAt,
                    metrics: {
                        totalParkingRecords: metrics.totalParkingRecords,
                        uniqueParticipants: metrics.uniqueParticipants,
                        timeSlotDistribution: metrics.timeSlotDistribution,
                        daysSinceFirstRecord: Math.floor(
                            (new Date() - new Date(metrics.firstRecordedAt)) / (1000 * 60 * 60 * 24)
                        )
                    }
                });

                promotedRegions.push(regionId);
            }
        } catch (error) {
            console.error(`[RegionService] Error processing region ${regionId}:`, error);
        }
    }

    console.log(`[RegionService] Aggregation complete. Promoted ${promotedRegions.length} regions.`);
    return promotedRegions;
}

module.exports = {
    getRegionStatus,
    isCoreRegion,
    aggregateRegionMetrics,
    meetsPromotionCriteria,
    runRegionAggregation,
    PROMOTION_THRESHOLDS
};
