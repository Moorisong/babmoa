/**
 * 주소에서 행정구역 ID 추출 (예: "대구광역시 수성구", "경북 경산시")
 * @param {string} address 전체 주소
 * @returns {string|null} 추출된 행정구역 ID
 */
function extractRegionFromAddress(address) {
    if (!address) return null;

    // 공백으로 분리하여 앞 2단어 추출
    const parts = address.split(' ');
    if (parts.length < 2) return null;

    // "대구광역시 수성구", "경상북도 경산시" 등
    return `${parts[0]} ${parts[1]}`;
}

module.exports = {
    extractRegionFromAddress
};
