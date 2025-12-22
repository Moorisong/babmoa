/**
 * 카카오맵 API 서비스
 * 장소 검색 및 상세 정보 조회
 * 캐싱 적용
 */

const { cacheService } = require('./cacheService');

const KAKAO_API_BASE = 'https://dapi.kakao.com/v2/local';
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

// 카테고리 매핑
const CATEGORY_MAP = {
    '전체': '',
    '한식': '한식',
    '중식': '중식',
    '일식': '일식',
    '양식': '양식',
    '고기': '고기',
    '해산물': '해산물',
    '분식': '분식',
    '카페': '카페',
    '술집': '술집',
};

/**
 * 배열 랜덤 셔플 (Fisher-Yates)
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

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
 * @param {string} keyword - 검색 키워드
 * @param {object} options - 옵션
 * @param {string} options.category - 카테고리 (한식, 중식 등)
 * @param {number} options.page - 페이지 번호
 * @param {number} options.size - 결과 개수
 * @param {boolean} options.shuffle - 결과 랜덤 셔플
 * @param {string} options.x - 경도 (무시됨, 마포구로 고정)
 * @param {string} options.y - 위도 (무시됨, 마포구로 고정)
 * @param {number} options.radius - 반경 (m)
 */
async function searchPlaces(keyword, options = {}) {
    const {
        radius = 5000,
        page = 1,
        size = 15,
        category = '전체',
        shuffle = false
    } = options;

    // 마포구 중심 좌표 (홍대입구역 기준)
    const MAPO_CENTER = {
        x: '126.9246033',
        y: '37.5571519'
    };

    // 카테고리 키워드 추가
    const categoryKeyword = CATEGORY_MAP[category] || '';
    let searchKeyword = keyword;

    // 마포구 키워드가 없으면 추가
    if (!keyword.includes('마포') && !keyword.includes('홍대') && !keyword.includes('합정') && !keyword.includes('망원') && !keyword.includes('연남')) {
        searchKeyword = `마포구 ${keyword}`;
    }

    // 맛집/음식점/식당 키워드가 없으면 추가
    if (!searchKeyword.includes('맛집') && !searchKeyword.includes('음식점') && !searchKeyword.includes('식당')) {
        searchKeyword = categoryKeyword
            ? `${searchKeyword} ${categoryKeyword}`
            : `${searchKeyword} 맛집`;
    } else if (categoryKeyword && !searchKeyword.includes(categoryKeyword)) {
        searchKeyword = `${searchKeyword} ${categoryKeyword}`;
    }

    // 캐시 키 생성 (v2: 주소 필터링 적용)
    const cacheKey = cacheService.getSearchCacheKey(
        'mapo:v2',
        `${searchKeyword}:${page}:${size}:${category}`
    );

    // 캐시 확인
    const cached = cacheService.get(cacheKey);
    if (cached) {
        console.log(`[캐시 히트] 장소 검색: ${searchKeyword}`);
        // 셔플 옵션이 있으면 캐시된 결과도 셔플
        if (shuffle && cached.places) {
            return { ...cached, places: shuffleArray(cached.places) };
        }
        return cached;
    }

    console.log(`[API 호출] 장소 검색: ${searchKeyword} (page: ${page})`);
    const params = {
        query: searchKeyword,
        page,
        size: 15,
        x: MAPO_CENTER.x,
        y: MAPO_CENTER.y,
        radius,
        sort: 'distance',
    };

    const data = await callKakaoApi('/search/keyword.json', params);

    console.log(`[API 결과] 전체: ${data.documents.length}건`);

    // 음식점, 카페, 술집만 필터링
    const foodCategories = ['음식점', '카페', '술집'];
    const filteredDocs = data.documents.filter(doc => {
        // 카테고리 필터
        if (!foodCategories.includes(doc.category_group_name)) return false;

        // 마포구 지역 필터 (주소에 '마포구'가 포함되어야 함)
        const address = doc.road_address_name || doc.address_name || '';
        const isMapo = address.includes('마포구');

        if (!isMapo) {
            console.log(`[필터링 제외] ${doc.place_name}: ${address} (마포구 아님)`);
            return false;
        }

        return true;
    });

    console.log(`[필터 결과] ${filteredDocs.length}건 유효`);

    // 중복 제거 (placeId 기준)
    const seen = new Set();
    const uniqueDocs = filteredDocs.filter(doc => {
        if (seen.has(doc.id)) return false;
        seen.add(doc.id);
        return true;
    }).slice(0, size);

    // 결과 가공
    let places = uniqueDocs.map(doc => ({
        placeId: doc.id,
        name: doc.place_name,
        address: doc.road_address_name || doc.address_name,
        category: doc.category_group_name || doc.category_name,
        categoryDetail: doc.category_name,
        phone: doc.phone,
        x: doc.x,
        y: doc.y,
    }));

    // 셔플 옵션
    if (shuffle) {
        places = shuffleArray(places);
    }

    const result = {
        places,
        meta: {
            totalCount: data.meta.total_count,
            pageableCount: data.meta.pageable_count,
            isEnd: data.meta.is_end,
            currentPage: page,
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
    const cacheKey = cacheService.getDetailCacheKey(placeId);

    const cached = cacheService.get(cacheKey);
    if (cached) {
        console.log(`[캐시 히트] 장소 상세: ${placeId}`);
        return cached;
    }

    console.log(`[캐시 미스] 장소 상세: ${placeId}`);
    return null;
}

/**
 * 사용 가능한 카테고리 목록
 */
function getCategories() {
    return Object.keys(CATEGORY_MAP);
}

module.exports = {
    searchPlaces,
    getPlaceDetail,
    getCategories,
    CATEGORY_MAP,
};
