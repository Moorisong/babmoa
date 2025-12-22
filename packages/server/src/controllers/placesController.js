const kakaoMapService = require('../services/kakaoMapService');
const ParkingStats = require('../models/ParkingStats');

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

        // 주차 성공률 데이터 병합 (현재 시간대 기준)
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
                if (stat.totalAttempts > 0) {
                    statsMap.set(stat.placeId, {
                        parkingSuccessRate: Math.round(stat.successRate * 100),
                        totalParkingAttempts: stat.totalAttempts,
                        timeSlot: currentTimeSlot,
                    });
                }
            });

            result.places = result.places.map(place => ({
                ...place,
                parkingSuccessRate: statsMap.get(place.placeId)?.parkingSuccessRate || null,
                totalParkingAttempts: statsMap.get(place.placeId)?.totalParkingAttempts || 0,
            }));
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
