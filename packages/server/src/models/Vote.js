const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
    schemaVersion: {
        type: Number,
        default: 1
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VoteRoom',
        required: true
    },
    placeId: {
        type: String,
        default: null  // null이면 패스(상관없음)
    },
    participantId: {
        type: String,
        required: true  // 브라우저 생성 UUID
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

// 1인 1표 보장: roomId + participantId 조합 유니크
voteSchema.index({ roomId: 1, participantId: 1 }, { unique: true });

// 투표 결과 집계용 인덱스
voteSchema.index({ roomId: 1, placeId: 1 });

module.exports = mongoose.model('Vote', voteSchema);
