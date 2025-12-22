const { ParkingData, ParkingStats, VoteRoom } = require('../models');
const { updateStatsOnNewRecord } = require('../services/aggregationService');

// POST /api/parking - 주차 경험 기록
exports.recordParking = async (req, res) => {
    try {
        const { roomId, placeId, participantId, parkingAvailable, parkingExperience, date, timeSlot } = req.body;

        // 유효성 검사
        if (!roomId || !placeId || !participantId || parkingAvailable === undefined || !timeSlot) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_REQUEST', message: '필수 필드가 누락되었습니다' }
            });
        }

        // 투표방 조회
        const room = await VoteRoom.findById(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: '투표방을 찾을 수 없습니다' }
            });
        }

        // 마감 여부와 상관없이 주차 기록 허용 (명세 변경)
        // 자동 마감 체크만 수행
        await room.checkAndClose();

        // 주차 경험 처리 (주차장 없으면 null)
        const experience = parkingAvailable ? parkingExperience : null;

        // 주차 데이터 저장 (중복이면 업데이트)
        const parkingData = await ParkingData.findOneAndUpdate(
            { roomId, participantId },
            {
                roomId,
                placeId,
                participantId,
                parkingAvailable,
                parkingExperience: experience,
                date: new Date(date || Date.now()),
                timeSlot
            },
            { upsert: true, new: true }
        );

        // 가중치 적용 통계 업데이트
        await updateStatsOnNewRecord(parkingData);

        res.json({
            success: true,
            data: { recorded: true }
        });
    } catch (error) {
        console.error('recordParking error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다' }
        });
    }
};

// GET /api/parking/:placeId/stats - 장소별 주차 통계
exports.getStats = async (req, res) => {
    try {
        const { placeId } = req.params;

        // 모든 시간대 통계 조회
        const stats = await ParkingStats.find({ placeId });

        if (stats.length === 0) {
            return res.json({
                success: true,
                data: {
                    placeId,
                    totalAttempts: 0,
                    successRate: 0,
                    byTimeSlot: {}
                }
            });
        }

        // 시간대별 데이터 정리
        const byTimeSlot = {};
        let totalAttempts = 0;
        let weightedSuccess = 0;

        stats.forEach(stat => {
            byTimeSlot[stat.timeSlot] = {
                attempts: stat.totalAttempts,
                successRate: stat.successRate
            };
            totalAttempts += stat.totalAttempts;
            weightedSuccess += stat.successRate * stat.totalAttempts;
        });

        const overallSuccessRate = totalAttempts > 0 ? weightedSuccess / totalAttempts : 0;

        res.json({
            success: true,
            data: {
                placeId,
                totalAttempts,
                successRate: Math.round(overallSuccessRate * 100) / 100,
                byTimeSlot
            }
        });
    } catch (error) {
        console.error('getStats error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다' }
        });
    }
};
