const { VoteRoom, Vote, IpRateLimit } = require('../models');
const { CONFIG, ERROR_CODES } = require('../constants');
const { getClientIp, getCurrentTimeSlot } = require('../utils');

// POST /api/rooms - 투표방 생성
exports.createRoom = async (req, res) => {
    try {
        const { title, places, options, participantId } = req.body;
        const clientIp = getClientIp(req);

        // participantId 필수 체크
        if (!participantId) {
            return res.status(400).json({
                success: false,
                error: { code: ERROR_CODES.INVALID_REQUEST, message: 'participantId는 필수입니다' }
            });
        }

        const oneMinuteAgo = new Date(Date.now() - CONFIG.RATE_LIMIT_WINDOW_MS);

        // 1단계: IP + participantId 조합 (1분에 1개)
        const participantCount = await IpRateLimit.countDocuments({
            ip: clientIp,
            participantId: participantId,
            action: 'room_create',
            createdAt: { $gte: oneMinuteAgo }
        });

        if (participantCount >= CONFIG.RATE_LIMIT_PER_PARTICIPANT) {
            return res.status(429).json({
                success: false,
                error: { code: ERROR_CODES.RATE_LIMITED, message: '잠시 후 다시 시도해주세요 (1분에 1개 생성 가능)' }
            });
        }

        // 2단계: IP 단위 속도 기반 차단 (1분에 10개 초과 = 악용)
        const ipCount = await IpRateLimit.countDocuments({
            ip: clientIp,
            action: 'room_create',
            createdAt: { $gte: oneMinuteAgo }
        });

        if (ipCount >= CONFIG.RATE_LIMIT_IP_ABUSE_THRESHOLD) {
            return res.status(429).json({
                success: false,
                error: { code: ERROR_CODES.IP_BLOCKED, message: '과도한 요청이 감지되었습니다. 잠시 후 다시 시도해주세요' }
            });
        }

        // 유효성 검사
        if (!title || !places || places.length === 0) {
            return res.status(400).json({
                success: false,
                error: { code: ERROR_CODES.INVALID_REQUEST, message: '제목과 장소는 필수입니다' }
            });
        }

        if (!options?.deadline) {
            return res.status(400).json({
                success: false,
                error: { code: ERROR_CODES.INVALID_REQUEST, message: '마감 시간은 필수입니다' }
            });
        }

        const room = await VoteRoom.create({
            title,
            places,
            creatorParticipantId: participantId,  // 생성자 ID 저장
            options: {
                allowPass: options.allowPass ?? true,
                deadline: new Date(options.deadline)
            }
        });

        // Rate Limit 로그 기록
        await IpRateLimit.create({
            ip: clientIp,
            participantId: participantId,
            action: 'room_create'
        });

        res.status(201).json({
            success: true,
            data: { roomId: room._id }
        });
    } catch (error) {
        console.error('createRoom error:', error);
        res.status(500).json({
            success: false,
            error: { code: ERROR_CODES.SERVER_ERROR, message: '서버 오류가 발생했습니다' }
        });
    }
};

// GET /api/rooms/:id - 투표방 조회
exports.getRoom = async (req, res) => {
    try {
        const { id } = req.params;

        const room = await VoteRoom.findById(id);
        if (!room) {
            return res.status(404).json({
                success: false,
                error: { code: ERROR_CODES.NOT_FOUND, message: '투표방을 찾을 수 없습니다' }
            });
        }

        // 자동 마감 체크
        const isClosed = room.isExpired();
        if (isClosed && !room.isClosed) {
            await room.checkAndClose();
        }

        // 투표 참여자 수 집계
        const totalVotes = await Vote.countDocuments({ roomId: id });

        // 주차 정보 병합 (현재 시간대 기준)
        const placesWithParking = room.places.map(p => p.toObject ? p.toObject() : p);
        if (placesWithParking.length > 0) {
            const ParkingStats = require('../models/ParkingStats');
            const currentTimeSlot = getCurrentTimeSlot();

            const placeIds = placesWithParking.map(p => p.placeId);
            const parkingStats = await ParkingStats.find({
                placeId: { $in: placeIds },
                timeSlot: currentTimeSlot
            });

            const statsMap = new Map();
            parkingStats.forEach(stat => {
                const hasEnoughData = stat.totalAttempts >= CONFIG.MIN_PARKING_RECORDS;
                statsMap.set(stat.placeId, {
                    parkingAvailable: stat.successCount > 0 ? true : (stat.failCount > 0 ? false : null),
                    successRate: hasEnoughData ? stat.successRate : null,
                    recordCount: stat.totalAttempts,
                    timeSlot: currentTimeSlot,
                    hasEnoughData,
                });
            });

            room.places = placesWithParking.map(place => ({
                ...place,
                parkingInfo: statsMap.get(place.placeId) || null
            }));
        }

        res.json({
            success: true,
            data: {
                roomId: room._id,
                title: room.title,
                places: room.places,
                options: room.options,
                result: room.result,
                isClosed: room.isExpired(),
                createdAt: room.createdAt,
                totalVotes,  // 투표 참여자 수
                creatorParticipantId: room.creatorParticipantId  // 생성자 ID
            }
        });
    } catch (error) {
        console.error('getRoom error:', error);
        res.status(500).json({
            success: false,
            error: { code: ERROR_CODES.SERVER_ERROR, message: '서버 오류가 발생했습니다' }
        });
    }
};

// POST /api/rooms/:id/vote - 투표하기
exports.vote = async (req, res) => {
    try {
        const { id } = req.params;
        const { placeId, participantId } = req.body;

        // 유효성 검사
        if (!participantId) {
            return res.status(400).json({
                success: false,
                error: { code: ERROR_CODES.INVALID_REQUEST, message: 'participantId는 필수입니다' }
            });
        }

        // 투표방 조회
        const room = await VoteRoom.findById(id);
        if (!room) {
            return res.status(404).json({
                success: false,
                error: { code: ERROR_CODES.NOT_FOUND, message: '투표방을 찾을 수 없습니다' }
            });
        }

        // 자동 마감 확인
        if (room.isExpired()) {
            await room.checkAndClose();
            return res.status(400).json({
                success: false,
                error: { code: ERROR_CODES.VOTE_CLOSED, message: '투표가 마감되었습니다' }
            });
        }

        // 패스 허용 확인
        if (placeId === null && !room.options.allowPass) {
            return res.status(400).json({
                success: false,
                error: { code: ERROR_CODES.PASS_NOT_ALLOWED, message: '패스가 허용되지 않습니다' }
            });
        }

        // 중복 투표 체크 및 저장 (upsert)
        await Vote.findOneAndUpdate(
            { roomId: id, participantId },
            { roomId: id, placeId, participantId },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            data: { recorded: true }
        });
    } catch (error) {
        console.error('vote error:', error);
        res.status(500).json({
            success: false,
            error: { code: ERROR_CODES.SERVER_ERROR, message: '서버 오류가 발생했습니다' }
        });
    }
};

// GET /api/rooms/:id/results - 투표 결과 조회 (마감 후만)
exports.getResults = async (req, res) => {
    try {
        const { id } = req.params;

        // 투표방 조회
        const room = await VoteRoom.findById(id);
        if (!room) {
            return res.status(404).json({
                success: false,
                error: { code: ERROR_CODES.NOT_FOUND, message: '투표방을 찾을 수 없습니다' }
            });
        }

        // 마감 여부와 상관없이 결과 확인 가능 (명세 변경)
        // 자동 마감 체크
        await room.checkAndClose();

        // 투표 집계
        const votes = await Vote.aggregate([
            { $match: { roomId: room._id } },
            { $group: { _id: '$placeId', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const voteResults = votes.map(v => ({
            placeId: v._id,
            count: v.count
        }));

        // 우승자 결정 (동점이면 첫 번째)
        const winnerPlaceId = voteResults.length > 0 ? voteResults[0].placeId : null;

        // 결과 저장 (아직 저장 안 됐으면)
        if (!room.result.winnerPlaceId && winnerPlaceId) {
            room.result = {
                winnerPlaceId,
                decidedAt: new Date()
            };
            await room.save();
        }

        res.json({
            success: true,
            data: {
                winnerPlaceId: room.result.winnerPlaceId || winnerPlaceId,
                votes: voteResults
            }
        });
    } catch (error) {
        console.error('getResults error:', error);
        res.status(500).json({
            success: false,
            error: { code: ERROR_CODES.SERVER_ERROR, message: '서버 오류가 발생했습니다' }
        });
    }
};

// POST /api/rooms/:id/close - 투표 마감하기 (누구나 가능)
exports.closeRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const { participantId } = req.body;

        // 유효성 검사
        if (!participantId) {
            return res.status(400).json({
                success: false,
                error: { code: ERROR_CODES.INVALID_REQUEST, message: 'participantId는 필수입니다' }
            });
        }

        // 투표방 조회
        const room = await VoteRoom.findById(id);
        if (!room) {
            return res.status(404).json({
                success: false,
                error: { code: ERROR_CODES.NOT_FOUND, message: '투표방을 찾을 수 없습니다' }
            });
        }


        // 이미 마감된 경우
        if (room.isExpired()) {
            return res.status(400).json({
                success: false,
                error: { code: ERROR_CODES.VOTE_CLOSED, message: '이미 마감된 투표입니다' }
            });
        }

        // 마감 시간을 현재 시간으로 변경
        room.options.deadline = new Date();
        await room.checkAndClose();

        res.json({
            success: true,
            data: { closed: true }
        });
    } catch (error) {
        console.error('closeRoom error:', error);
        res.status(500).json({
            success: false,
            error: { code: ERROR_CODES.SERVER_ERROR, message: '서버 오류가 발생했습니다' }
        });
    }
};
