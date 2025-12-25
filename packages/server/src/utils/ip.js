/**
 * IP 관련 유틸리티 함수
 */

/**
 * 클라이언트 IP 추출 (프록시/로드밸런서 고려)
 * @param {Object} req - Express request 객체
 * @returns {string} 클라이언트 IP 주소
 */
function getClientIp(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.ip ||
        'unknown'
    );
}

module.exports = {
    getClientIp,
};
