const express = require('express');
const router = express.Router();
const b2bController = require('../controllers/b2bController');

// GET /api/b2b/parking/:placeId - 특정 장소 집계 데이터
router.get('/parking/:placeId', b2bController.getPlaceStats);

// GET /api/b2b/parking/bulk - 다건 장소 집계 데이터
router.get('/parking/bulk', b2bController.getBulkStats);

module.exports = router;
