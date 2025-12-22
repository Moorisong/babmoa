const mongoose = require('mongoose');

const parkingStatsSchema = new mongoose.Schema({
    placeId: {
        type: String,
        required: true
    },
    timeSlot: {
        type: String,
        enum: ['평일_점심', '평일_저녁', '주말'],
        required: true
    },
    totalAttempts: {
        type: Number,
        default: 0
    },
    successCount: {
        type: Number,
        default: 0  // 문제없음
    },
    partialCount: {
        type: Number,
        default: 0  // 조금불편
    },
    failCount: {
        type: Number,
        default: 0  // 못함
    },
    unknownCount: {
        type: Number,
        default: 0  // 모름
    },
    successRate: {
        type: Number,
        default: 0  // 0~1, 계산식: (successCount + partialCount*0.5) / totalAttempts
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// placeId + timeSlot 복합 유니크
parkingStatsSchema.index({ placeId: 1, timeSlot: 1 }, { unique: true });

// successRate 계산 메서드
parkingStatsSchema.methods.calculateSuccessRate = function () {
    if (this.totalAttempts === 0) {
        this.successRate = 0;
    } else {
        this.successRate = (this.successCount + this.partialCount * 0.5) / this.totalAttempts;
    }
    return this.successRate;
};

// 통계 업데이트 스태틱 메서드
parkingStatsSchema.statics.updateStats = async function (placeId, timeSlot, experience) {
    const update = {
        $inc: { totalAttempts: 1 },
        $set: { lastUpdated: new Date() }
    };

    // 경험별 카운트 증가
    switch (experience) {
        case '문제없음':
            update.$inc.successCount = 1;
            break;
        case '조금불편':
            update.$inc.partialCount = 1;
            break;
        case '못함':
            update.$inc.failCount = 1;
            break;
        case '모름':
        default:
            update.$inc.unknownCount = 1;
            break;
    }

    const stats = await this.findOneAndUpdate(
        { placeId, timeSlot },
        update,
        { upsert: true, new: true }
    );

    // successRate 재계산
    stats.calculateSuccessRate();
    await stats.save();

    return stats;
};

module.exports = mongoose.model('ParkingStats', parkingStatsSchema);
