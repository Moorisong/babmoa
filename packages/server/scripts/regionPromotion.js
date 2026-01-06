#!/usr/bin/env node

/**
 * Region Promotion Batch Script
 * 
 * 1일 1회 실행되는 배치 작업
 * - 모든 지역의 지표 집계
 * - 승격 조건 충족 시 자동으로 CORE_REGION 승격
 * - Promotion Audit Log 기록
 * 
 * 실행 방법:
 *   node scripts/regionPromotion.js
 * 
 * cron 예시 (매일 04:00 KST 실행):
 *   0 4 * * * cd /path/to/server && node scripts/regionPromotion.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { runRegionAggregation } = require('../src/services/regionService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/babmoa';

async function main() {
    console.log('='.repeat(60));
    console.log('[RegionPromotion] Starting batch job...');
    console.log(`[RegionPromotion] Time: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    try {
        // MongoDB 연결
        await mongoose.connect(MONGODB_URI);
        console.log('[RegionPromotion] Connected to MongoDB');

        // 지역 집계 및 자동 승격 실행
        const promotedRegions = await runRegionAggregation();

        console.log('='.repeat(60));
        console.log('[RegionPromotion] Batch job completed');
        console.log(`[RegionPromotion] Promoted regions: ${promotedRegions.length}`);
        if (promotedRegions.length > 0) {
            console.log('[RegionPromotion] Promoted list:', promotedRegions);
        }
        console.log('='.repeat(60));

    } catch (error) {
        console.error('[RegionPromotion] Error:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('[RegionPromotion] Disconnected from MongoDB');
    }
}

main();
