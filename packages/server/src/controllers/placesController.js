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
        const { keyword, x, y, radius, page = 1, size = 15, category, shuffle } = req.query;

        if (!keyword) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_REQUEST', message: '검색어를 입력해주세요' }
            });
        }

        // 1. "Deep Fetch" 전략: 카카오 API에서 충분한 데이터(3페이지, 약 45개)를 먼저 확보
        // 정렬 정확도를 높이기 위해 요청된 페이지와 무관하게 앞부분 데이터를 모두 긁어옵니다.
        // 성능 최적화를 위해 Promise.all로 병렬 요청
        const fetchPages = [1, 2, 3];
        const searchPromises = fetchPages.map(p =>
            kakaoMapService.searchPlaces(keyword, {
                x, y,
                radius: radius ? parseInt(radius) : undefined,
                page: p,
                size: 15, // 카카오 API 페이지당 최대
                category: category || '전체',
                shuffle: false // 자체 정렬할 것이므로 셔플 끔
            })
        );

        const results = await Promise.all(searchPromises);

        // 2. 결과 통합 및 중복 제거
        const allPlacesMap = new Map();
        results.forEach(result => {
            if (result.places) {
                result.places.forEach(place => {
                    if (!allPlacesMap.has(place.placeId)) {
                        allPlacesMap.set(place.placeId, place);
                    }
                });
            }
        });
        let allPlaces = Array.from(allPlacesMap.values());

        // 3. 주차 정보 병합
        const placeIds = allPlaces.map(p => p.placeId);
        const currentTimeSlot = getCurrentTimeSlot();

        const parkingStats = await ParkingStats.find({
            placeId: { $in: placeIds },
            timeSlot: currentTimeSlot
        });

        const statsMap = new Map();
        parkingStats.forEach(stat => {
            const hasEnoughData = stat.totalAttempts >= MIN_RECORD_COUNT;
            statsMap.set(stat.placeId, {
                parkingAvailable: stat.successCount > 0 ? true : (stat.failCount > 0 ? false : null),
                successRate: hasEnoughData ? stat.successRate : 0, // 정렬용 기본값 0
                recordCount: stat.totalAttempts,
                timeSlot: currentTimeSlot,
                hasEnoughData,
                rawStat: stat // 정렬 상세 비교용
            });
        });

        // 4. Custom Sorting Logic
        // 우선순위: 
        // 1) 주차 데이터 보유 (≥ 3건)
        // 2) 주차 성공률 (내림차순)
        // 3) 주차 기록 수 (내림차순)
        // 4) 거리순 (기존 순서 유지 - stable sort 필요)

        allPlaces.sort((a, b) => {
            const infoA = statsMap.get(a.placeId);
            const infoB = statsMap.get(b.placeId);

            const hasDataA = infoA && infoA.hasEnoughData;
            const hasDataB = infoB && infoB.hasEnoughData;

            // 1. 데이터 보유 여부 (데이터 있는게 위로)
            if (hasDataA && !hasDataB) return -1;
            if (!hasDataA && hasDataB) return 1;

            // 둘 다 데이터가 있다면
            if (hasDataA && hasDataB) {
                // 2. 성공률 내림차순
                if (infoA.successRate !== infoB.successRate) {
                    return infoB.successRate - infoA.successRate;
                }
                // 3. 기록 수 내림차순
                return infoB.recordCount - infoA.recordCount;
            }

            // 둘 다 데이터가 없다면 -> 기존 순서(거리순) 유지 (0 반환)
            return 0;
        });

        // 5. Parking Info 주입
        allPlaces = allPlaces.map(place => ({
            ...place,
            parkingInfo: statsMap.get(place.placeId) ? {
                ...statsMap.get(place.placeId),
                rawStat: undefined // 클라이언트에겐 숨김
            } : null,
        }));

        // 6. 전체 결과 반환 (클라이언트에서 페이지네이션 + 필터링 처리)
        // 45개 정도는 10KB 미만이라 한 번에 전송해도 무방
        const totalCount = allPlaces.length;

        res.json({
            success: true,
            data: {
                places: allPlaces,
                meta: {
                    totalCount,
                    pageableCount: totalCount,
                    isEnd: true,
                    currentPage: 1,
                    currentTimeSlot
                }
            }
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
