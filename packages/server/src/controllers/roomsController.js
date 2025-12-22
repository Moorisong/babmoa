const { VoteRoom, Vote } = require('../models');

// POST /api/rooms - 투표방 생성
exports.createRoom = async (req, res) => {
    try {
        const { title, places, options } = req.body;

        // 유효성 검사
        if (!title || !places || places.length === 0) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_REQUEST', message: '제목과 장소는 필수입니다' }
            });
        }

        if (!options?.deadline) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_REQUEST', message: '마감 시간은 필수입니다' }
            });
        }

        const room = await VoteRoom.create({
            title,
            places,
            options: {
                allowPass: options.allowPass ?? true,
                deadline: new Date(options.deadline)
            }
        });

        res.status(201).json({
            success: true,
            data: { roomId: room._id }
        });
    } catch (error) {
        console.error('createRoom error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다' }
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
                error: { code: 'NOT_FOUND', message: '투표방을 찾을 수 없습니다' }
            });
        }

        // 자동 마감 체크
        const isClosed = room.isExpired();
        if (isClosed && !room.isClosed) {
            await room.checkAndClose();
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
                createdAt: room.createdAt
            }
        });
    } catch (error) {
        console.error('getRoom error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다' }
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
                error: { code: 'INVALID_REQUEST', message: 'participantId는 필수입니다' }
            });
        }

        // 투표방 조회
        const room = await VoteRoom.findById(id);
        if (!room) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: '투표방을 찾을 수 없습니다' }
            });
        }

        // 자동 마감 확인
        if (room.isExpired()) {
            await room.checkAndClose();
            return res.status(400).json({
                success: false,
                error: { code: 'VOTE_CLOSED', message: '투표가 마감되었습니다' }
            });
        }

        // 패스 허용 확인
        if (placeId === null && !room.options.allowPass) {
            return res.status(400).json({
                success: false,
                error: { code: 'PASS_NOT_ALLOWED', message: '패스가 허용되지 않습니다' }
            });
        }

        // 중복 투표 체크 및 저장 (upsert)
        const vote = await Vote.findOneAndUpdate(
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
            error: { code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다' }
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
                error: { code: 'NOT_FOUND', message: '투표방을 찾을 수 없습니다' }
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
            error: { code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다' }
        });
    }
};
