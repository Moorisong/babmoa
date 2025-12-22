const express = require('express');
const router = express.Router();
const placesController = require('../controllers/placesController');

// GET /api/places/search - 장소 검색
router.get('/search', placesController.searchPlaces);

module.exports = router;
