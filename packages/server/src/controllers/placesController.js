const kakaoMapService = require('../services/kakaoMapService');
const ParkingStats = require('../models/ParkingStats');

// 최소 기록 수 기준
const MIN_RECORD_COUNT = 3;

// 현재 시간대 계산
function getCurrentTimeSlot() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    if (day === 0 || day === 6) return '주말';
    if (hour >= 18) return '평일_저녁';
    return '평일_점심';
}

// GET /api/places/search - 장소 검색
exports.searchPlaces = async (req, res) => {
    try {
        const { keyword, x, y, radius, page, size, category, shuffle } = req.query;

        if (!keyword) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_REQUEST', message: '검색어를 입력해주세요' }
            });
        }

        const result = await kakaoMapService.searchPlaces(keyword, {
            x,
            y,
            radius: radius ? parseInt(radius) : undefined,
            page: page ? parseInt(page) : 1,
            size: size ? parseInt(size) : 15,
            category: category || '전체',
            shuffle: shuffle === 'true',
        });

        // 주차 정보 병합 (현재 시간대 기준)
        if (result.places && result.places.length > 0) {
            const placeIds = result.places.map(p => p.placeId);
            const currentTimeSlot = getCurrentTimeSlot();

            // 현재 시간대 데이터 조회
            const parkingStats = await ParkingStats.find({
                placeId: { $in: placeIds },
                timeSlot: currentTimeSlot
            });

            const statsMap = new Map();
            parkingStats.forEach(stat => {
                const hasEnoughData = stat.totalAttempts >= MIN_RECORD_COUNT;
                statsMap.set(stat.placeId, {
                    parkingInfo: {
                        parkingAvailable: stat.successCount > 0 ? true : (stat.failCount > 0 ? false : null),
                        successRate: hasEnoughData ? stat.successRate : null,
                        recordCount: stat.totalAttempts,
                        timeSlot: currentTimeSlot,
                        hasEnoughData,
                    }
                });
            });

            result.places = result.places.map(place => ({
                ...place,
                parkingInfo: statsMap.get(place.placeId)?.parkingInfo || null,
            }));

            // 현재 시간대 메타 정보 추가
            result.meta.currentTimeSlot = currentTimeSlot;
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('searchPlaces error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message || '서버 오류가 발생했습니다' }
        });
    }
};

// GET /api/places/categories - 카테고리 목록
exports.getCategories = (req, res) => {
    res.json({
        success: true,
        data: {
            categories: kakaoMapService.getCategories(),
        }
    });
};
