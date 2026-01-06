const mongoose = require('mongoose');

/**
 * 지역 상태 모델
 * 행정구역(시/군/구) 단위로 주차 정보 노출 여부를 관리
 * 
 * [!CAUTION] metrics 필드는 승격 판단 및 내부 집계 용도로만 사용
 * API 응답, 클라이언트, B2B, 리포트에는 절대 사용하지 않는다.
 */

const regionStateSchema = new mongoose.Schema({
    // 행정구역 코드 (예: "서울특별시 강남구")
    regionId: {
        type: String,
        required: true,
        unique: true
    },
    // 지역 상태
    status: {
        type: String,
        enum: ['OPEN', 'CANDIDATE', 'CORE'],
        default: 'OPEN'
    },
    // 승격 판단용 내부 집계 지표 (외부 노출 금지)
    metrics: {
        totalParkingRecords: { type: Number, default: 0 },
        uniqueParticipants: { type: Number, default: 0 },
        timeSlotDistribution: { type: Number, default: 0 },
        firstRecordedAt: { type: Date, default: null },
        lastRecordedAt: { type: Date, default: null }
    },
    // 승격 시점 (CORE로 변경된 시점)
    promotedAt: {
        type: Date,
        default: null
    },
    // 마지막 집계 시점
    lastAggregatedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// regionId 인덱스 (unique)
regionStateSchema.index({ regionId: 1 }, { unique: true });

// status 인덱스 (조회 최적화)
regionStateSchema.index({ status: 1 });

module.exports = mongoose.model('RegionState', regionStateSchema);
