/**
 * 카카오맵 API 서비스
 * 장소 검색 및 상세 정보 조회
 * 캐싱 적용
 * 지원 지역: 관악구, 영등포구, 강남구
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
const SUPPORTED_DISTRICTS = ['관악구', '영등포구', '강남구'];

const DISTRICT_CONFIG = {
    '관악구': {
        center: { x: '126.9516', y: '37.4783' },
        keywords: ['관악', '신림', '봉천', '서울대', '낙성대']
    },
    '영등포구': {
        center: { x: '126.9101', y: '37.5261' },
        keywords: ['영등포', '여의도', '당산', '문래', '신길']
    },
    '강남구': {
        center: { x: '127.0276', y: '37.4979' },
        keywords: ['강남', '역삼', '삼성', '논현', '청담', '압구정', '선릉', '코엑스']
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
 * 장소 검색 (키워드)
 */
async function searchPlaces(keyword, options = {}) {
    const {
        radius = 5000,
        page = 1,
        size = 15,
        category = '전체',
        shuffle = false
    } = options;

    const categoryKeyword = CATEGORY_MAP[category] || '';
    let baseKeyword = keyword;

    // 맛집/음식점/식당 키워드가 없으면 추가
    if (!baseKeyword.includes('맛집') && !baseKeyword.includes('음식점') && !baseKeyword.includes('식당')) {
        baseKeyword = categoryKeyword
            ? `${baseKeyword} ${categoryKeyword}`
            : `${baseKeyword} 맛집`;
    } else if (categoryKeyword && !baseKeyword.includes(categoryKeyword)) {
        baseKeyword = `${baseKeyword} ${categoryKeyword}`;
    }

    // 지역구 자동 감지
    let targetDistrict = null;
    for (const [districtName, config] of Object.entries(DISTRICT_CONFIG)) {
        if (config.keywords.some(kw => keyword.includes(kw)) || keyword.includes(districtName)) {
            targetDistrict = districtName;
            break;
        }
    }

    // 지역구가 없으면 3개 지역 모두 검색
    if (!targetDistrict) {
        const cacheKey = cacheService.getSearchCacheKey(
            'districts:v3:multi',
            `${baseKeyword}:${page}:${size}:${category}`
        );
        const cached = cacheService.get(cacheKey);
        if (cached) {
            if (shuffle && cached.places) {
                return { ...cached, places: shuffleArray(cached.places) };
            }
            return cached;
        }

        // 3개 지역 동시 검색
        const allDocs = [];
        const searchPromises = SUPPORTED_DISTRICTS.map(async (districtName) => {
            const config = DISTRICT_CONFIG[districtName];
            const districtSearchKeyword = `${districtName} ${baseKeyword}`;

            try {
                const data = await callKakaoApi('/search/keyword.json', {
                    query: districtSearchKeyword,
                    page,
                    size: 15,
                    x: config.center.x,
                    y: config.center.y,
                    radius,
                    sort: 'distance',
                });
                return data.documents;
            } catch {
                return [];
            }
        });

        const results = await Promise.all(searchPromises);
        results.forEach(docs => allDocs.push(...docs));

        // 음식점, 카페, 술집만 필터링 + 지원 지역 필터
        const foodCategories = ['음식점', '카페', '술집'];
        const filteredDocs = allDocs.filter(doc => {
            if (!foodCategories.includes(doc.category_group_name)) return false;
            const address = doc.road_address_name || doc.address_name || '';
            return SUPPORTED_DISTRICTS.some(d => address.includes(d));
        });

        // 중복 제거 (slice 제거 - 전체 결과 반환)
        const seen = new Set();
        const uniqueDocs = filteredDocs.filter(doc => {
            if (seen.has(doc.id)) return false;
            seen.add(doc.id);
            return true;
        });

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
            meta: { totalCount: uniqueDocs.length, pageableCount: uniqueDocs.length, isEnd: true, currentPage: page },
        };

        cacheService.set(cacheKey, result, cacheService.TTL.PLACE_SEARCH);
        return result;
    }

    // 특정 지역구 검색
    const districtConfig = DISTRICT_CONFIG[targetDistrict];
    const centerCoords = districtConfig.center;
    let searchKeyword = baseKeyword;

    if (!keyword.includes(targetDistrict)) {
        searchKeyword = `${targetDistrict} ${baseKeyword}`;
    }

    const cacheKey = cacheService.getSearchCacheKey(
        'districts:v3',
        `${searchKeyword}:${page}:${size}:${category}:${targetDistrict}`
    );

    const cached = cacheService.get(cacheKey);
    if (cached) {
        if (shuffle && cached.places) {
            return { ...cached, places: shuffleArray(cached.places) };
        }
        return cached;
    }

    const data = await callKakaoApi('/search/keyword.json', {
        query: searchKeyword,
        page,
        size: 15,
        x: centerCoords.x,
        y: centerCoords.y,
        radius,
        sort: 'distance',
    });

    const foodCategories = ['음식점', '카페', '술집'];
    const filteredDocs = data.documents.filter(doc => {
        if (!foodCategories.includes(doc.category_group_name)) return false;
        const address = doc.road_address_name || doc.address_name || '';
        return SUPPORTED_DISTRICTS.some(d => address.includes(d));
    });

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
