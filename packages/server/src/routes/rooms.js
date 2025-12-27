const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/roomsController');

// POST /api/rooms - 투표방 생성
router.post('/', roomsController.createRoom);

// GET /api/rooms/:id - 투표방 조회
router.get('/:id', roomsController.getRoom);

// POST /api/rooms/:id/vote - 투표하기
router.post('/:id/vote', roomsController.vote);

// GET /api/rooms/:id/results - 투표 결과 조회 (마감 후만)
router.get('/:id/results', roomsController.getResults);

// POST /api/rooms/:id/close - 투표 마감하기 (누구나 가능)
router.post('/:id/close', roomsController.closeRoom);

module.exports = router;
