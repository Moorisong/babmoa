const kakaoMapService = require('../services/kakaoMapService');
const ParkingStats = require('../models/ParkingStats');

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

        // 주차 성공률 데이터 병합
        if (result.places && result.places.length > 0) {
            const placeIds = result.places.map(p => p.placeId);
            const parkingStats = await ParkingStats.find({ placeId: { $in: placeIds } });

            const statsMap = new Map();
            parkingStats.forEach(stat => {
                statsMap.set(stat.placeId, {
                    parkingSuccessRate: stat.totalSuccess > 0
                        ? Math.round((stat.totalSuccess / stat.totalAttempts) * 100)
                        : null,
                    totalParkingAttempts: stat.totalAttempts,
                });
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
