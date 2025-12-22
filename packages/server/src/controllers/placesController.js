const kakaoMapService = require('../services/kakaoMapService');

// GET /api/places/search - 장소 검색
exports.searchPlaces = async (req, res) => {
    try {
        const { keyword, x, y, radius, page, size } = req.query;

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
            page: page ? parseInt(page) : undefined,
            size: size ? parseInt(size) : undefined,
        });

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
