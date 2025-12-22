const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');

// POST /api/parking - 주차 경험 기록
router.post('/', parkingController.recordParking);

// GET /api/parking/:placeId/stats - 장소별 주차 통계
router.get('/:placeId/stats', parkingController.getStats);

module.exports = router;
