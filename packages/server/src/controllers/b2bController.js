const { ParkingStats } = require('../models');

// GET /api/b2b/parking/:placeId - 특정 장소 집계 데이터
exports.getPlaceStats = async (req, res) => {
    try {
        const { placeId } = req.params;

        const stats = await ParkingStats.find({ placeId });

        if (stats.length === 0) {
            return res.json({
                success: true,
                data: null
            });
        }

        // 시간대별 데이터 정리
        const byTimeSlot = {};
        let totalAttempts = 0;
        let weightedSuccess = 0;

        stats.forEach(stat => {
            byTimeSlot[stat.timeSlot] = {
                attempts: stat.totalAttempts,
                successCount: stat.successCount,
                partialCount: stat.partialCount,
                failCount: stat.failCount,
                unknownCount: stat.unknownCount,
                successRate: stat.successRate
            };
            totalAttempts += stat.totalAttempts;
            weightedSuccess += stat.successRate * stat.totalAttempts;
        });

        res.json({
            success: true,
            data: {
                placeId,
                totalAttempts,
                successRate: totalAttempts > 0 ? Math.round((weightedSuccess / totalAttempts) * 100) / 100 : 0,
                byTimeSlot,
                lastUpdated: stats.reduce((latest, stat) =>
                    stat.lastUpdated > latest ? stat.lastUpdated : latest,
                    stats[0].lastUpdated
                )
            }
        });
    } catch (error) {
        console.error('getPlaceStats error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다' }
        });
    }
};

// GET /api/b2b/parking/bulk - 다건 장소 집계 데이터
exports.getBulkStats = async (req, res) => {
    try {
        const { placeIds } = req.query;

        if (!placeIds) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_REQUEST', message: 'placeIds 쿼리 파라미터가 필요합니다' }
            });
        }

        // placeIds는 콤마로 구분된 문자열 또는 배열
        const placeIdArray = Array.isArray(placeIds) ? placeIds : placeIds.split(',');

        const stats = await ParkingStats.find({ placeId: { $in: placeIdArray } });

        // 장소별로 그룹화
        const grouped = {};
        stats.forEach(stat => {
            if (!grouped[stat.placeId]) {
                grouped[stat.placeId] = {
                    placeId: stat.placeId,
                    totalAttempts: 0,
                    byTimeSlot: {},
                    lastUpdated: stat.lastUpdated
                };
            }
            grouped[stat.placeId].byTimeSlot[stat.timeSlot] = {
                attempts: stat.totalAttempts,
                successRate: stat.successRate
            };
            grouped[stat.placeId].totalAttempts += stat.totalAttempts;
            if (stat.lastUpdated > grouped[stat.placeId].lastUpdated) {
                grouped[stat.placeId].lastUpdated = stat.lastUpdated;
            }
        });

        // 전체 성공률 계산
        Object.values(grouped).forEach(place => {
            let weightedSuccess = 0;
            Object.values(place.byTimeSlot).forEach(slot => {
                weightedSuccess += slot.successRate * slot.attempts;
            });
            place.successRate = place.totalAttempts > 0
                ? Math.round((weightedSuccess / place.totalAttempts) * 100) / 100
                : 0;
        });

        res.json({
            success: true,
            data: Object.values(grouped)
        });
    } catch (error) {
        console.error('getBulkStats error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다' }
        });
    }
};
