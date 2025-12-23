const express = require('express');
const router = express.Router();
const placesController = require('../controllers/placesController');

// GET /api/places/search - 장소 검색
router.get('/search', placesController.searchPlaces);

// GET /api/places/categories - 카테고리 목록
router.get('/categories', placesController.getCategories);

// GET /api/places/district/:district - 지역별 장소 목록 (지도 마커용)
router.get('/district/:district', placesController.getPlacesByDistrict);

module.exports = router;
