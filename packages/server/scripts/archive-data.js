/**
 * 데이터 아카이빙 스크립트
 * 매월 1회 실행 권장 (cron 또는 수동)
 * 
 * 사용법:
 *   node scripts/archive-data.js
 *   node scripts/archive-data.js --keep-original  # 원본 유지
 *   node scripts/archive-data.js --years=1        # 1년 이상 된 데이터
 */

const mongoose = require('mongoose');
require('dotenv').config();

const archivingService = require('../src/services/archivingService');

async function main() {
    // CLI 옵션 파싱
    const args = process.argv.slice(2);
    const keepOriginal = args.includes('--keep-original');
    const yearsArg = args.find(a => a.startsWith('--years='));
    const yearsOld = yearsArg ? parseInt(yearsArg.split('=')[1], 10) : 1;

    console.log('=== Babmoa Data Archiving ===');
    console.log(`Options: deleteOriginal=${!keepOriginal}, yearsOld=${yearsOld}`);

    try {
        // MongoDB 연결
        await mongoose.connect(process.env.MONGODB_URI, { dbName: 'babmoa' });
        console.log('MongoDB connected');

        // 아카이빙 전 통계
        console.log('\n[Before] Archive stats:', await archivingService.getArchiveStats());

        // 아카이빙 실행
        const result = await archivingService.runArchive({
            deleteOriginal: !keepOriginal,
            yearsOld,
        });

        if (result.success) {
            console.log('\n[Result]');
            console.log(`  VoteRooms: ${result.results.voteRooms.archived} archived, ${result.results.voteRooms.deleted} deleted`);
            console.log(`  Votes: ${result.results.votes.archived} archived, ${result.results.votes.deleted} deleted`);
        } else {
            console.error('\n[Error]', result.error);
        }

        // 아카이빙 후 통계
        console.log('\n[After] Archive stats:', await archivingService.getArchiveStats());

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
