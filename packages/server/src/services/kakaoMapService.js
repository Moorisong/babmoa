/**
 * 카카오맵 API 서비스
 * 장소 검색 및 상세 정보 조회
 * 캐싱 적용
 * 지원 지역: 대구시, 경산시
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

        // 2개 지역 동시 검색
        const allDocs = [];
        const searchPromises = SUPPORTED_DISTRICTS.map(async (districtName) => {
            const config = DISTRICT_CONFIG[districtName];
            const searchKeyword = DISTRICT_SEARCH_KEYWORD[districtName] || districtName;
            const districtSearchKeyword = `${searchKeyword} ${baseKeyword}`;

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
            return SUPPORTED_DISTRICTS.some(district => {
                const keywords = DISTRICT_ADDRESS_KEYWORDS[district] || [district];
                return keywords.some(keyword => address.includes(keyword));
            });
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
    const districtSearchKeyword = DISTRICT_SEARCH_KEYWORD[targetDistrict] || targetDistrict;
    let searchKeyword = baseKeyword;

    if (!keyword.includes(targetDistrict) && !keyword.includes(districtSearchKeyword)) {
        searchKeyword = `${districtSearchKeyword} ${baseKeyword}`;
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
        return SUPPORTED_DISTRICTS.some(district => {
            const keywords = DISTRICT_ADDRESS_KEYWORDS[district] || [district];
            return keywords.some(keyword => address.includes(keyword));
        });
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
