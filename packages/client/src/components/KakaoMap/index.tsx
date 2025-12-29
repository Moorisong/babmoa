'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { KakaoPlace } from '@/lib/api';
import styles from './KakaoMap.module.css';

// 카카오맵 타입 선언
declare global {
    interface Window {
        kakao: {
            maps: {
                load: (callback: () => void) => void;
                Map: new (container: HTMLElement, options: MapOptions) => KakaoMapInstance;
                LatLng: new (lat: number, lng: number) => LatLng;
                LatLngBounds: new () => LatLngBounds;
                Marker: new (options: MarkerOptions) => Marker;
                InfoWindow: new (options: InfoWindowOptions) => InfoWindow;
                CustomOverlay: new (options: CustomOverlayOptions) => CustomOverlay;
                event: {
                    addListener: (target: unknown, type: string, callback: () => void) => void;
                    removeListener: (target: unknown, type: string, callback: () => void) => void;
                };
                services: {
                    Places: new () => PlacesService;
                    Status: {
                        OK: string;
                        ZERO_RESULT: string;
                    };
                };
            };
        };
    }
}

interface MapOptions { center: LatLng; level: number; maxLevel?: number; }
interface LatLng { getLat: () => number; getLng: () => number; }
interface LatLngBounds { extend: (latlng: LatLng) => void; getSouthWest: () => LatLng; getNorthEast: () => LatLng; }
interface MarkerOptions { position: LatLng; map?: KakaoMapInstance; }
interface InfoWindowOptions { content: string; removable?: boolean; }
interface CustomOverlayOptions { content: HTMLElement | string; position: LatLng; xAnchor?: number; yAnchor?: number; }
interface Marker { setMap: (map: KakaoMapInstance | null) => void; getPosition: () => LatLng; }
interface InfoWindow { open: (map: KakaoMapInstance, marker: Marker) => void; close: () => void; }
interface CustomOverlay { setMap: (map: KakaoMapInstance | null) => void; }
interface KakaoMapInstance { setCenter: (latlng: LatLng) => void; setLevel: (level: number) => void; getLevel: () => number; getCenter: () => LatLng; getBounds: () => LatLngBounds; panTo: (latlng: LatLng) => void; }
interface PlacesService { keywordSearch: (keyword: string, callback: (result: PlaceResult[], status: string, pagination: Pagination) => void, options?: PlaceSearchOptions) => void; categorySearch: (categoryCode: string, callback: (result: PlaceResult[], status: string, pagination: Pagination) => void, options?: CategorySearchOptions) => void; }
interface PlaceResult { id: string; place_name: string; address_name: string; road_address_name: string; category_group_name: string; category_name: string; phone: string; x: string; y: string; }
interface Pagination { hasNextPage: boolean; nextPage: () => void; }
interface PlaceSearchOptions { location?: LatLng; radius?: number; bounds?: LatLngBounds; }
interface CategorySearchOptions { bounds?: LatLngBounds; useMapBounds?: boolean; }

const DISTRICT_CONFIG = {
    '관악구': { lat: 37.4783, lng: 126.9516, level: 5 },
    '영등포구': { lat: 37.5261, lng: 126.9101, level: 5 },
    '강남구': { lat: 37.4979, lng: 127.0276, level: 5 },
};

const DISTRICT_BOUNDS = {
    '관악구': { south: 37.44, north: 37.50, west: 126.91, east: 126.98 },
    '영등포구': { south: 37.50, north: 37.55, west: 126.87, east: 126.93 },
    '강남구': { south: 37.48, north: 37.54, west: 127.01, east: 127.09 },
};

const isInDistrict = (lat: number, lng: number, bounds: { south: number; north: number; west: number; east: number }): boolean => {
    return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
};

const isInSupportedArea = (lat: number, lng: number): boolean => {
    return isInDistrict(lat, lng, DISTRICT_BOUNDS['관악구']) ||
        isInDistrict(lat, lng, DISTRICT_BOUNDS['영등포구']) ||
        isInDistrict(lat, lng, DISTRICT_BOUNDS['강남구']);
};

interface KakaoMapProps {
    district: '관악구' | '영등포구' | '강남구';
    onMarkerClick: (place: KakaoPlace) => void;
    focusCoords?: { x: string; y: string } | null;
}

export default function KakaoMap({ district, onMarkerClick, focusCoords }: KakaoMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<KakaoMapInstance | null>(null);
    const placesServiceRef = useRef<PlacesService | null>(null);
    const markersRef = useRef<Marker[]>([]);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [searchingPlaces, setSearchingPlaces] = useState(false);
    const [isOutOfBounds, setIsOutOfBounds] = useState(false);

    const clearMarkers = useCallback(() => {
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
    }, []);

    const searchPlacesInBounds = useCallback(() => {
        if (!mapInstanceRef.current || !placesServiceRef.current || !isLoaded) return;

        const center = mapInstanceRef.current.getCenter();
        const centerLat = center.getLat();
        const centerLng = center.getLng();

        // 현재 선택된 구의 경계만 확인
        const currentDistrictBounds = DISTRICT_BOUNDS[district];
        if (!isInDistrict(centerLat, centerLng, currentDistrictBounds)) {
            setIsOutOfBounds(true);
            clearMarkers();
            setSearchingPlaces(false);
            return;
        }

        setIsOutOfBounds(false);
        setSearchingPlaces(true);
        clearMarkers();

        // 선택된 구의 고정 경계를 사용 (지도 bounds가 아닌)
        const districtBounds = new window.kakao.maps.LatLngBounds();
        const sw = new window.kakao.maps.LatLng(currentDistrictBounds.south, currentDistrictBounds.west);
        const ne = new window.kakao.maps.LatLng(currentDistrictBounds.north, currentDistrictBounds.east);
        districtBounds.extend(sw);
        districtBounds.extend(ne);

        placesServiceRef.current.categorySearch('FD6', (results, status) => {
            setSearchingPlaces(false);

            if (status === window.kakao.maps.services.Status.OK) {
                // 선택된 구의 경계 내에만 있는 장소만 필터링
                const filteredResults = results.filter(place => {
                    const placeLat = parseFloat(place.y);
                    const placeLng = parseFloat(place.x);
                    return isInDistrict(placeLat, placeLng, currentDistrictBounds);
                });

                if (filteredResults.length === 0) {
                    setIsOutOfBounds(true);
                    return;
                }

                filteredResults.forEach((place) => {
                    const position = new window.kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x));
                    const marker = new window.kakao.maps.Marker({ position, map: mapInstanceRef.current! });

                    window.kakao.maps.event.addListener(marker, 'click', () => {
                        const kakaoPlace: KakaoPlace = {
                            placeId: place.id,
                            name: place.place_name,
                            address: place.road_address_name || place.address_name,
                            category: place.category_group_name || '음식점',
                            categoryDetail: place.category_name,
                            phone: place.phone,
                            x: place.x,
                            y: place.y,
                            parkingInfo: null,
                        };
                        onMarkerClick(kakaoPlace);
                    });

                    markersRef.current.push(marker);
                });
            }
        }, { bounds: districtBounds });
    }, [isLoaded, clearMarkers, onMarkerClick, district]);

    const handleMapIdle = useCallback(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            searchPlacesInBounds();
        }, 300);
    }, [searchPlacesInBounds]);

    // 지도 초기화 (최초 한 번만 실행)
    useEffect(() => {
        if (!window.kakao?.maps) return;

        window.kakao.maps.load(() => {
            if (!mapRef.current) return;

            const config = DISTRICT_CONFIG[district];
            const center = new window.kakao.maps.LatLng(config.lat, config.lng);
            const map = new window.kakao.maps.Map(mapRef.current, {
                center,
                level: config.level,
                maxLevel: 7  // 최대 줌아웃 레벨 제한 (너무 멀리 줌아웃 방지)
            });
            const places = new window.kakao.maps.services.Places();

            mapInstanceRef.current = map;
            placesServiceRef.current = places;

            window.kakao.maps.event.addListener(map, 'idle', handleMapIdle);
            setIsLoaded(true);

            setTimeout(() => searchPlacesInBounds(), 500);
        });

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 최초 마운트 시에만 실행

    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded) return;

        // district 변경 시 진행 중인 검색 타임아웃 취소
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = null;
        }

        // 기존 마커 제거 및 상태 초기화
        clearMarkers();
        setSearchingPlaces(false);
        setIsOutOfBounds(false);

        const config = DISTRICT_CONFIG[district];
        const center = new window.kakao.maps.LatLng(config.lat, config.lng);
        mapInstanceRef.current.panTo(center);
        mapInstanceRef.current.setLevel(config.level);

        // 새로운 지역의 장소 검색
        setTimeout(() => searchPlacesInBounds(), 500);
    }, [district, isLoaded, clearMarkers, searchPlacesInBounds]);

    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded || !focusCoords) return;
        const position = new window.kakao.maps.LatLng(parseFloat(focusCoords.y), parseFloat(focusCoords.x));
        mapInstanceRef.current.panTo(position);
        mapInstanceRef.current.setLevel(3);
    }, [focusCoords, isLoaded]);

    return (
        <div className={styles.container}>
            <div ref={mapRef} className={styles.map} />

            {(!isLoaded || searchingPlaces) && (
                <div className={styles.overlay}>
                    <div className={styles.loadingContent}>
                        <svg className={styles.spinner} viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className={styles.loadingText}>
                            {!isLoaded ? '지도 로딩 중...' : '주변 식당 검색 중...'}
                        </span>
                    </div>
                </div>
            )}

            {isLoaded && isOutOfBounds && (
                <div className={styles.outOfBoundsOverlay}>
                    <div className={styles.outOfBoundsCard}>
                        <div className={styles.outOfBoundsEmoji}>🚫</div>
                        <h3 className={styles.outOfBoundsTitle}>지원 지역이 아닙니다</h3>
                        <p className={styles.outOfBoundsText}>
                            현재 <b>관악구, 영등포구, 강남구</b>만 서비스 중입니다.
                        </p>
                        <p className={styles.outOfBoundsHint}>지역 버튼을 눌러 지원 지역으로 이동하세요</p>
                    </div>
                </div>
            )}
        </div>
    );
}
