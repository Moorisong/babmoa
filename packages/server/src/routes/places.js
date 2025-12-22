const express = require('express');
const router = express.Router();
const placesController = require('../controllers/placesController');

// GET /api/places/search - 장소 검색
router.get('/search', placesController.searchPlaces);

// GET /api/places/categories - 카테고리 목록
router.get('/categories', placesController.getCategories);

module.exports = router;
