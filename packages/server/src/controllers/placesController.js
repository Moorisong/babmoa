const kakaoMapService = require('../services/kakaoMapService');
const ParkingStats = require('../models/ParkingStats');
const { getRegionStatus: fetchRegionStatus } = require('../services/regionService');
const { CONFIG, ERROR_CODES } = require('../constants');
const { getCurrentTimeSlot } = require('../utils');

// GET /api/places/search - 장소 검색
exports.searchPlaces = async (req, res) => {
    try {
        const { keyword, x, y, radius, category } = req.query;

        if (!keyword) {
            return res.status(400).json({
                success: false,
                error: { code: ERROR_CODES.INVALID_REQUEST, message: '검색어를 입력해주세요' }
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
            const hasEnoughData = stat.totalAttempts >= CONFIG.MIN_PARKING_RECORDS;
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
            error: { code: ERROR_CODES.SERVER_ERROR, message: error.message || '서버 오류가 발생했습니다' }
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

// GET /api/places/district/:district - 지역별 장소 목록 (지도 마커용)
exports.getPlacesByDistrict = async (req, res) => {
    try {
        const { district } = req.params;

        if (!CONFIG.SUPPORTED_DISTRICTS.includes(district)) {
            return res.status(400).json({
                success: false,
                error: { code: ERROR_CODES.INVALID_DISTRICT, message: '지원하지 않는 지역입니다' }
            });
        }

        // 해당 지역의 맛집 검색
        const result = await kakaoMapService.searchPlaces(`${district} 맛집`, {
            page: 1,
            size: 15,
            category: '전체'
        });

        if (!result.places || result.places.length === 0) {
            return res.json({
                success: true,
                data: { places: [], meta: { totalCount: 0 } }
            });
        }

        // 주차 정보 병합
        const placeIds = result.places.map(p => p.placeId);
        const currentTimeSlot = getCurrentTimeSlot();

        const parkingStats = await ParkingStats.find({
            placeId: { $in: placeIds },
            timeSlot: currentTimeSlot
        });

        const statsMap = new Map();
        parkingStats.forEach(stat => {
            const hasEnoughData = stat.totalAttempts >= CONFIG.MIN_PARKING_RECORDS;
            statsMap.set(stat.placeId, {
                parkingAvailable: stat.successCount > 0 ? true : (stat.failCount > 0 ? false : null),
                successRate: hasEnoughData ? stat.successRate : null,
                recordCount: stat.totalAttempts,
                timeSlot: currentTimeSlot,
                hasEnoughData
            });
        });

        const placesWithParking = result.places.map(place => ({
            ...place,
            parkingInfo: statsMap.get(place.placeId) || null
        }));

        res.json({
            success: true,
            data: {
                places: placesWithParking,
                meta: {
                    totalCount: placesWithParking.length,
                    district,
                    currentTimeSlot
                }
            }
        });

    } catch (error) {
        console.error('getPlacesByDistrict error:', error);
        res.status(500).json({
            success: false,
            error: { code: ERROR_CODES.SERVER_ERROR, message: error.message || '서버 오류가 발생했습니다' }
        });
    }
};

// GET /api/places/region-status - 지역 상태 조회
// regionId: 주소 기반 행정구역 ID (예: "대구광역시 수성구")
exports.getRegionStatus = async (req, res) => {
    try {
        const { regionId } = req.query;

        if (!regionId) {
            return res.json({
                success: true,
                data: { regionStatus: 'OPEN' }  // 기본값
            });
        }

        const status = await fetchRegionStatus(regionId);

        res.json({
            success: true,
            data: { regionStatus: status }
        });
    } catch (error) {
        console.error('getRegionStatus error:', error);
        res.status(500).json({
            success: false,
            error: { code: ERROR_CODES.SERVER_ERROR, message: error.message || '서버 오류가 발생했습니다' }
        });
    }
};

// POST /api/places/bulk-info - 여러 장소의 목록 정보 조회 (주차/지역 상태)
// body: { places: [{ placeId, address }] }
exports.getBulkPlacesInfo = async (req, res) => {
    try {
        const { places } = req.body;

        if (!places || !Array.isArray(places)) {
            return res.status(400).json({
                success: false,
                error: { code: ERROR_CODES.INVALID_REQUEST, message: '잘못된 요청 형식입니다' }
            });
        }

        const currentTimeSlot = getCurrentTimeSlot();
        const placeIds = places.map(p => p.placeId);

        // 1. 주차 통계 조회
        const parkingStats = await ParkingStats.find({
            placeId: { $in: placeIds },
            timeSlot: currentTimeSlot
        });

        const statsMap = new Map();
        parkingStats.forEach(stat => {
            const hasEnoughData = stat.totalAttempts >= CONFIG.MIN_PARKING_RECORDS;
            statsMap.set(stat.placeId, {
                hasParking: stat.successCount > 0,
                successRate: hasEnoughData ? stat.successRate : null,
                badge: hasEnoughData ? 'P' : null
            });
        });

        // 2. 결과 조합 - regionStatus에 따라 parkingInfo 포함 여부 결정
        const { extractRegionFromAddress } = require('../utils');

        const results = await Promise.all(places.map(async (place) => {
            const regionId = extractRegionFromAddress(place.address);
            const status = await fetchRegionStatus(regionId); // 'OPEN', 'CANDIDATE', 'CORE'
            const stats = statsMap.get(place.placeId);

            // CORE_REGION만 parkingInfo 포함, 그 외는 필드 자체 제거 (null 포함 금지)
            if (status === 'CORE' && stats) {
                return {
                    placeId: place.placeId,
                    regionStatus: status,
                    parkingInfo: {
                        hasParking: stats.hasParking,
                        successRate: stats.successRate,
                        badge: stats.badge
                    }
                };
            }

            // OPEN/CANDIDATE는 parkingInfo 필드 없음
            return {
                placeId: place.placeId,
                regionStatus: status
            };
        }));

        res.json({
            success: true,
            results
        });

    } catch (error) {
        console.error('getBulkPlacesInfo error:', error);
        res.status(500).json({
            success: false,
            error: { code: ERROR_CODES.SERVER_ERROR, message: error.message || '서버 오류가 발생했습니다' }
        });
    }
};
