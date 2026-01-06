/**
 * 유틸리티 함수 re-export
 */

const { getCurrentTimeSlot } = require('./time');
const { getClientIp } = require('./ip');
const { extractRegionFromAddress } = require('./region');

module.exports = {
    getCurrentTimeSlot,
    getClientIp,
    extractRegionFromAddress,
};
