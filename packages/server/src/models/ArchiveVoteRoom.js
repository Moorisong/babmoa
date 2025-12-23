const mongoose = require('mongoose');

// ArchiveVoteRoom Schema
const archiveVoteRoomSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    title: { type: String, required: true },
    places: [{
        id: String,
        name: String,
        address: String,
        category: String,
    }],
    options: {
        allowPass: Boolean,
        deadline: Date,
    },
    result: {
        winner: {
            id: String,
            name: String,
            voteCount: Number,
        },
        totalVotes: Number,
        confirmedAt: Date,
    },
    createdAt: { type: Date, required: true },
    archivedAt: { type: Date, default: Date.now },
});

archiveVoteRoomSchema.index({ createdAt: 1 });
archiveVoteRoomSchema.index({ archivedAt: 1 });

module.exports = mongoose.model('ArchiveVoteRoom', archiveVoteRoomSchema);
