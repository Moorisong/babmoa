/**
 * 서버 사이드 캐싱 서비스
 * 카카오맵 API 응답 캐싱
 */

// 간단한 인메모리 캐시
const cache = new Map();

// TTL 설정 (밀리초)
const TTL = {
    PLACE_SEARCH: 24 * 60 * 60 * 1000,  // 24시간
    PLACE_DETAIL: 7 * 24 * 60 * 60 * 1000,  // 7일
};

/**
 * 캐시에서 데이터 조회
 */
function get(key) {
    const entry = cache.get(key);

    if (!entry) return null;

    // 만료 확인
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }

    return entry.data;
}

/**
 * 캐시에 데이터 저장
 */
function set(key, data, ttl) {
    cache.set(key, {
        data,
        expiresAt: Date.now() + ttl,
    });
}

/**
 * 캐시 키 삭제
 */
function del(key) {
    cache.delete(key);
}

/**
 * 만료된 캐시 정리 (주기적 실행용)
 */
function cleanup() {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
        if (now > entry.expiresAt) {
            cache.delete(key);
        }
    }
}

// 1시간마다 캐시 정리
setInterval(cleanup, 60 * 60 * 1000);

// ========================================
// 카카오맵 API 캐싱 래퍼
// ========================================

/**
 * 장소 검색 결과 캐싱 키 생성
 */
function getSearchCacheKey(region, keyword) {
    return `search:${region}:${keyword}`;
}

/**
 * 장소 상세 정보 캐싱 키 생성
 */
function getDetailCacheKey(placeId) {
    return `detail:${placeId}`;
}

const cacheService = {
    get,
    set,
    del,
    cleanup,
    TTL,
    getSearchCacheKey,
    getDetailCacheKey,
};

module.exports = { cacheService };
