const mongoose = require('mongoose');

// ArchiveVote Schema
const archiveVoteSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    roomId: { type: String, required: true },
    placeId: { type: String, required: true },
    participantId: { type: String, required: true },
    createdAt: { type: Date, required: true },
    archivedAt: { type: Date, default: Date.now },
});

archiveVoteSchema.index({ roomId: 1 });
archiveVoteSchema.index({ createdAt: 1 });
archiveVoteSchema.index({ archivedAt: 1 });

module.exports = mongoose.model('ArchiveVote', archiveVoteSchema);
