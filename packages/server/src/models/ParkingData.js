const mongoose = require('mongoose');

const parkingDataSchema = new mongoose.Schema({
    schemaVersion: {
        type: Number,
        default: 1
    },
    placeId: {
        type: String,
        required: true
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VoteRoom',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    timeSlot: {
        type: String,
        enum: ['평일_점심', '평일_저녁', '주말'],
        required: true
    },
    parkingAvailable: {
        type: Boolean,
        required: true
    },
    parkingExperience: {
        type: String,
        enum: ['문제없음', '조금불편', '못함', '모름', null],
        default: null
        // parkingAvailable=false이면 null
    },
    participantId: {
        type: String,
        required: true
    },
    // 행정구역 ID (예: "서울특별시 강남구")
    // 지역 기반 집계 및 승격 판단에 사용
    regionId: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 31536000  // TTL: 1년 (초 단위)
    }
});

// 중복 기록 방지: roomId + participantId
parkingDataSchema.index({ roomId: 1, participantId: 1 }, { unique: true });

// 집계용 인덱스
parkingDataSchema.index({ placeId: 1, timeSlot: 1, createdAt: -1 });

// 지역 집계용 인덱스
parkingDataSchema.index({ regionId: 1, createdAt: -1 });

// 저장 전 유효성 검사
parkingDataSchema.pre('save', function (next) {
    // 주차장 없으면 경험은 null
    if (!this.parkingAvailable) {
        this.parkingExperience = null;
    }
    next();
});

module.exports = mongoose.model('ParkingData', parkingDataSchema);
