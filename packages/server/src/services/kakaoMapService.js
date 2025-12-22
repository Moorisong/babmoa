/**
 * 카카오맵 API 서비스
 * 장소 검색 및 상세 정보 조회
 * 캐싱 적용
 */

const { cacheService } = require('./cacheService');

const KAKAO_API_BASE = 'https://dapi.kakao.com/v2/local';
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

/**
 * 카카오 API 호출 헬퍼
 */
async function callKakaoApi(endpoint, params = {}) {
    if (!KAKAO_REST_API_KEY) {
        throw new Error('KAKAO_REST_API_KEY가 설정되지 않았습니다');
    }

    const url = new URL(`${KAKAO_API_BASE}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
    });

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`,
        },
    });

    if (!response.ok) {
        throw new Error(`카카오 API 오류: ${response.status}`);
    }

    return response.json();
}

/**
 * 장소 검색 (키워드)
 * 캐시 TTL: 24시간
 */
async function searchPlaces(keyword, options = {}) {
    const { x, y, radius = 5000, page = 1, size = 15 } = options;

    // 캐시 키 생성
    const cacheKey = cacheService.getSearchCacheKey(
        `${x || 'default'},${y || 'default'}`,
        `${keyword}:${page}:${size}`
    );

    // 캐시 확인
    const cached = cacheService.get(cacheKey);
    if (cached) {
        console.log(`[캐시 히트] 장소 검색: ${keyword}`);
        return cached;
    }

    // API 호출
    console.log(`[API 호출] 장소 검색: ${keyword}`);
    const params = {
        query: keyword,
        page,
        size,
    };

    if (x && y) {
        params.x = x;
        params.y = y;
        params.radius = radius;
        params.sort = 'distance';
    }

    const data = await callKakaoApi('/search/keyword.json', params);

    // 결과 가공
    const result = {
        places: data.documents.map(doc => ({
            placeId: doc.id,
            name: doc.place_name,
            address: doc.road_address_name || doc.address_name,
            category: doc.category_group_name || doc.category_name,
            phone: doc.phone,
            x: doc.x,
            y: doc.y,
        })),
        meta: {
            totalCount: data.meta.total_count,
            pageableCount: data.meta.pageable_count,
            isEnd: data.meta.is_end,
        },
    };

    // 캐시 저장
    cacheService.set(cacheKey, result, cacheService.TTL.PLACE_SEARCH);

    return result;
}

/**
 * 장소 상세 정보 조회
 * 캐시 TTL: 7일
 */
async function getPlaceDetail(placeId) {
    // 캐시 키 생성
    const cacheKey = cacheService.getDetailCacheKey(placeId);

    // 캐시 확인
    const cached = cacheService.get(cacheKey);
    if (cached) {
        console.log(`[캐시 히트] 장소 상세: ${placeId}`);
        return cached;
    }

    // 카카오맵은 ID로 상세 조회하는 공식 API가 없음
    // 검색 결과에서 ID 매칭으로 찾거나, 키워드 검색으로 대체
    console.log(`[캐시 미스] 장소 상세: ${placeId}`);

    // 실제로는 검색 결과 캐시에서 찾거나 null 반환
    return null;
}

module.exports = {
    searchPlaces,
    getPlaceDetail,
};
