const mongoose = require('mongoose');
const VoteRoom = require('../models/VoteRoom');
const Vote = require('../models/Vote');
const ArchiveVoteRoom = require('../models/ArchiveVoteRoom');
const ArchiveVote = require('../models/ArchiveVote');

/**
 * 데이터 아카이빙 서비스
 * 3년이 지난 VoteRoom, Vote 데이터를 Archive 컬렉션으로 이동
 */
const archivingService = {
    /**
     * 아카이빙 실행 (매월 1회 권장)
     * @param {Object} options
     * @param {boolean} options.deleteOriginal - 원본 삭제 여부 (기본: true)
     * @param {number} options.yearsOld - 몇 년 이상 된 데이터 (기본: 3)
     */
    async runArchive(options = {}) {
        const { deleteOriginal = true, yearsOld = 1 } = options;

        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsOld);

        console.log(`[Archiving] Starting archive for data older than ${cutoffDate.toISOString()}`);

        const results = {
            voteRooms: { archived: 0, deleted: 0 },
            votes: { archived: 0, deleted: 0 },
        };

        try {
            // 1. VoteRoom 아카이빙
            const oldVoteRooms = await VoteRoom.find({
                createdAt: { $lt: cutoffDate }
            }).lean();

            if (oldVoteRooms.length > 0) {
                const archiveData = oldVoteRooms.map(room => ({
                    _id: room._id,
                    title: room.title,
                    places: room.places.map(p => ({
                        id: p.id,
                        name: p.name,
                        address: p.address,
                        category: p.category,
                    })),
                    options: {
                        allowPass: room.options?.allowPass,
                        deadline: room.options?.deadline,
                    },
                    result: room.result,
                    createdAt: room.createdAt,
                }));

                await ArchiveVoteRoom.insertMany(archiveData, { ordered: false }).catch(err => {
                    // 중복 키 에러 무시 (이미 아카이빙된 데이터)
                    if (err.code !== 11000) throw err;
                });
                results.voteRooms.archived = archiveData.length;

                if (deleteOriginal) {
                    const deleteResult = await VoteRoom.deleteMany({
                        createdAt: { $lt: cutoffDate }
                    });
                    results.voteRooms.deleted = deleteResult.deletedCount;
                }
            }

            // 2. Vote 아카이빙
            const oldVotes = await Vote.find({
                createdAt: { $lt: cutoffDate }
            }).lean();

            if (oldVotes.length > 0) {
                const archiveVoteData = oldVotes.map(vote => ({
                    _id: vote._id,
                    roomId: vote.roomId,
                    placeId: vote.placeId,
                    participantId: vote.participantId,
                    createdAt: vote.createdAt,
                }));

                await ArchiveVote.insertMany(archiveVoteData, { ordered: false }).catch(err => {
                    if (err.code !== 11000) throw err;
                });
                results.votes.archived = archiveVoteData.length;

                if (deleteOriginal) {
                    const deleteResult = await Vote.deleteMany({
                        createdAt: { $lt: cutoffDate }
                    });
                    results.votes.deleted = deleteResult.deletedCount;
                }
            }

            console.log('[Archiving] Complete:', results);
            return { success: true, results };

        } catch (error) {
            console.error('[Archiving] Error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * 아카이브 통계 조회
     */
    async getArchiveStats() {
        const [voteRoomCount, voteCount] = await Promise.all([
            ArchiveVoteRoom.countDocuments(),
            ArchiveVote.countDocuments(),
        ]);

        return {
            archivedVoteRooms: voteRoomCount,
            archivedVotes: voteCount,
        };
    },
};

module.exports = archivingService;
