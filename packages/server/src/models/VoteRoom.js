const mongoose = require('mongoose');

const voteRoomSchema = new mongoose.Schema({
    schemaVersion: {
        type: Number,
        default: 1
    },
    title: {
        type: String,
        required: true
    },
    places: [{
        placeId: { type: String, required: true },
        name: { type: String, required: true },
        address: { type: String },
        category: { type: String }
    }],
    options: {
        allowPass: { type: Boolean, default: true },
        deadline: { type: Date, required: true }
    },
    result: {
        winnerPlaceId: { type: String, default: null },
        decidedAt: { type: Date, default: null }
    },
    isClosed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true  // createdAt, updatedAt 자동 생성
});

// 인덱스
voteRoomSchema.index({ createdAt: -1 });
voteRoomSchema.index({ 'options.deadline': 1, isClosed: 1 });

// 자동 마감 체크 메서드
voteRoomSchema.methods.checkAndClose = async function () {
    if (!this.isClosed && new Date() >= new Date(this.options.deadline)) {
        this.isClosed = true;
        await this.save();
    }
    return this.isClosed;
};

// 마감 여부 확인 (저장 없음)
voteRoomSchema.methods.isExpired = function () {
    return this.isClosed || new Date() >= new Date(this.options.deadline);
};

module.exports = mongoose.model('VoteRoom', voteRoomSchema);
