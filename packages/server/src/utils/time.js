/**
 * 시간 관련 유틸리티 함수
 */

const { CONFIG } = require('../constants');

/**
 * 현재 시간대 계산
 * @returns {'평일_점심' | '평일_저녁' | '주말'}
 */
function getCurrentTimeSlot() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    // 주말 (토, 일)
    if (day === 0 || day === 6) {
        return CONFIG.TIME_SLOTS.WEEKEND;
    }

    // 평일 저녁 (18시 이후)
    if (hour >= 18) {
        return CONFIG.TIME_SLOTS.WEEKDAY_DINNER;
    }

    // 평일 점심
    return CONFIG.TIME_SLOTS.WEEKDAY_LUNCH;
}

module.exports = {
    getCurrentTimeSlot,
};
