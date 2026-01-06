/**
 * 카카오맵 API 서비스
 * 장소 검색 및 상세 정보 조회
 * 캐싱 적용
 * 검색 범위: 전국 (주차 정보 노출은 CORE_REGION에서만)
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

// 지원 지역 설정
const SUPPORTED_DISTRICTS = ['대구시', '경산시'];

// 주소 매칭용 키워드 (카카오 API 주소 형식에 맞춤)
const DISTRICT_ADDRESS_KEYWORDS = {
    '대구시': ['대구', '대구광역시'],
    '경산시': ['경산']
};

// 검색 시 사용할 지역명 (UI 표시명 -> 검색용 키워드)
const DISTRICT_SEARCH_KEYWORD = {
    '대구시': '대구',
    '경산시': '경산'
};

const DISTRICT_CONFIG = {
    '대구시': {
        center: { x: '128.6014', y: '35.8714' },
        keywords: ['대구', '동성로', '중구', '수성구', '달서구', '북구', '동구', '서구', '남구', '반월당', '김광석']
    },
    '경산시': {
        center: { x: '128.7411', y: '35.8247' },
        keywords: ['경산', '하양', '압량', '영남대']
    }
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
 * 장소 검색 (키워드) - 전국 범위
 * 주차 정보 노출은 Bulk Info API에서 CORE_REGION 여부로 결정
 */
async function searchPlaces(keyword, options = {}) {
    const {
        x,
        y,
        radius = 20000,
        page = 1,
        size = 15,
        category = '전체',
        shuffle = false
    } = options;

    const categoryKeyword = CATEGORY_MAP[category] || '';
    let searchKeyword = keyword;

    // 카테고리 키워드 추가
    if (categoryKeyword && !searchKeyword.includes(categoryKeyword)) {
        searchKeyword = `${searchKeyword} ${categoryKeyword}`;
    }

    // 맛집/음식점/식당 키워드가 없으면 추가
    if (!searchKeyword.includes('맛집') && !searchKeyword.includes('음식점') && !searchKeyword.includes('식당')) {
        searchKeyword = `${searchKeyword} 맛집`;
    }

    const cacheKey = cacheService.getSearchCacheKey(
        'nationwide:v1',
        `${searchKeyword}:${page}:${size}:${category}:${x || 'none'}:${y || 'none'}`
    );

    const cached = cacheService.get(cacheKey);
    if (cached) {
        if (shuffle && cached.places) {
            return { ...cached, places: shuffleArray(cached.places) };
        }
        return cached;
    }

    // 카카오 API 호출 파라미터
    const params = {
        query: searchKeyword,
        page,
        size: 15,
        sort: 'accuracy',
    };

    // 위치 기반 검색 (x, y가 제공된 경우)
    if (x && y) {
        params.x = x;
        params.y = y;
        params.radius = radius;
        params.sort = 'distance';
    }

    const data = await callKakaoApi('/search/keyword.json', params);

    // 음식점, 카페, 술집만 필터링 (지역 필터 없음 - 전국 검색)
    const foodCategories = ['음식점', '카페', '술집'];
    const filteredDocs = data.documents.filter(doc =>
        foodCategories.includes(doc.category_group_name)
    );

    // 중복 제거
    const seen = new Set();
    const uniqueDocs = filteredDocs.filter(doc => {
        if (seen.has(doc.id)) return false;
        seen.add(doc.id);
        return true;
    }).slice(0, size);

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

    if (shuffle) places = shuffleArray(places);

    const result = {
        places,
        meta: {
            totalCount: data.meta.total_count,
            pageableCount: data.meta.pageable_count,
            isEnd: data.meta.is_end,
            currentPage: page,
        },
    };

    cacheService.set(cacheKey, result, cacheService.TTL.PLACE_SEARCH);
    return result;
}

/**
 * 장소 상세 정보 조회
 */
async function getPlaceDetail(placeId) {
    const cacheKey = cacheService.getDetailCacheKey(placeId);
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;
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
    SUPPORTED_DISTRICTS,
};
