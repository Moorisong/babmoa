/**
 * 유틸리티 함수 re-export
 */

const { getCurrentTimeSlot } = require('./time');
const { getClientIp } = require('./ip');

module.exports = {
    getCurrentTimeSlot,
    getClientIp,
};
