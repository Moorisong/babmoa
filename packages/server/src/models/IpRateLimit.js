const mongoose = require('mongoose');

// IP + participantId 기반 투표방 생성 제한용 로그
const ipRateLimitSchema = new mongoose.Schema({
    ip: {
        type: String,
        required: true
    },
    participantId: {
        type: String,
        required: true
    },
    action: {
        type: String,
        enum: ['room_create'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 259200 // TTL: 3일 (초)
    }
});

// 복합 인덱스: IP + participantId별 조회 최적화
ipRateLimitSchema.index({ ip: 1, participantId: 1, action: 1, createdAt: -1 });
// IP별 조회 (속도 기반 차단용)
ipRateLimitSchema.index({ ip: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model('IpRateLimit', ipRateLimitSchema);

