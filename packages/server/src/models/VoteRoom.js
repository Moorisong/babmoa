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
    }
}, {
    timestamps: true  // createdAt, updatedAt 자동 생성
});

// 인덱스
voteRoomSchema.index({ createdAt: -1 });

module.exports = mongoose.model('VoteRoom', voteRoomSchema);
