'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { KakaoPlace } from '@/lib/api';

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

interface MapOptions {
    center: LatLng;
    level: number;
}

interface LatLng {
    getLat: () => number;
    getLng: () => number;
}

interface LatLngBounds {
    extend: (latlng: LatLng) => void;
    getSouthWest: () => LatLng;
    getNorthEast: () => LatLng;
}

interface MarkerOptions {
    position: LatLng;
    map?: KakaoMapInstance;
}

interface InfoWindowOptions {
    content: string;
    removable?: boolean;
}

interface CustomOverlayOptions {
    content: HTMLElement | string;
    position: LatLng;
    xAnchor?: number;
    yAnchor?: number;
}

interface Marker {
    setMap: (map: KakaoMapInstance | null) => void;
    getPosition: () => LatLng;
}

interface InfoWindow {
    open: (map: KakaoMapInstance, marker: Marker) => void;
    close: () => void;
}

interface CustomOverlay {
    setMap: (map: KakaoMapInstance | null) => void;
}

interface KakaoMapInstance {
    setCenter: (latlng: LatLng) => void;
    setLevel: (level: number) => void;
    getLevel: () => number;
    getCenter: () => LatLng;
    getBounds: () => LatLngBounds;
    panTo: (latlng: LatLng) => void;
}

interface PlacesService {
    keywordSearch: (
        keyword: string,
        callback: (result: PlaceResult[], status: string, pagination: Pagination) => void,
        options?: PlaceSearchOptions
    ) => void;
    categorySearch: (
        categoryCode: string,
        callback: (result: PlaceResult[], status: string, pagination: Pagination) => void,
        options?: CategorySearchOptions
    ) => void;
}

interface PlaceResult {
    id: string;
    place_name: string;
    address_name: string;
    road_address_name: string;
    category_group_name: string;
    category_name: string;
    phone: string;
    x: string;
    y: string;
}

interface Pagination {
    hasNextPage: boolean;
    nextPage: () => void;
}

interface PlaceSearchOptions {
    location?: LatLng;
    radius?: number;
    bounds?: LatLngBounds;
}

interface CategorySearchOptions {
    bounds?: LatLngBounds;
    useMapBounds?: boolean;
}

// 지역 설정 (중심 좌표 + 대략적인 경계 반경)
const DISTRICT_CONFIG = {
    '관악구': { lat: 37.4783, lng: 126.9516, level: 5 },
    '영등포구': { lat: 37.5261, lng: 126.9101, level: 5 },
    '강남구': { lat: 37.4979, lng: 127.0276, level: 5 },
};

// 각 구의 대략적인 경계 (러프하게 설정 - 어차피 토스트로 필터링)
const DISTRICT_BOUNDS = {
    '관악구': {
        south: 37.44, north: 37.50,
        west: 126.91, east: 126.98,
    },
    '영등포구': {
        south: 37.50, north: 37.55,
        west: 126.87, east: 126.93,
    },
    '강남구': {
        south: 37.48, north: 37.54,
        west: 127.01, east: 127.09,
    },
};

// 좌표가 특정 구역 내에 있는지 확인
const isInDistrict = (lat: number, lng: number, bounds: { south: number; north: number; west: number; east: number }): boolean => {
    return (
        lat >= bounds.south &&
        lat <= bounds.north &&
        lng >= bounds.west &&
        lng <= bounds.east
    );
};

// 좌표가 지원 지역(3개 구 중 하나) 내에 있는지 확인
const isInSupportedArea = (lat: number, lng: number): boolean => {
    return (
        isInDistrict(lat, lng, DISTRICT_BOUNDS['관악구']) ||
        isInDistrict(lat, lng, DISTRICT_BOUNDS['영등포구']) ||
        isInDistrict(lat, lng, DISTRICT_BOUNDS['강남구'])
    );
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

    // 마커 제거 함수
    const clearMarkers = useCallback(() => {
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
    }, []);

    // 지도 영역에서 음식점 검색
    const searchPlacesInBounds = useCallback(() => {
        if (!mapInstanceRef.current || !placesServiceRef.current || !isLoaded) return;

        // 현재 지도 중심이 지원 지역 내에 있는지 확인
        const center = mapInstanceRef.current.getCenter();
        const centerLat = center.getLat();
        const centerLng = center.getLng();

        if (!isInSupportedArea(centerLat, centerLng)) {
            console.log('[KakaoMap] Out of supported area:', centerLat, centerLng);
            setIsOutOfBounds(true);
            clearMarkers();
            setSearchingPlaces(false);
            return;
        }

        setIsOutOfBounds(false);
        setSearchingPlaces(true);
        clearMarkers();

        const bounds = mapInstanceRef.current.getBounds();

        // 카테고리 코드: FD6 = 음식점
        placesServiceRef.current.categorySearch('FD6', (results, status) => {
            setSearchingPlaces(false);

            if (status === window.kakao.maps.services.Status.OK) {
                // 지원 지역 내의 음식점만 필터링
                const filteredResults = results.filter(place => {
                    const placeLat = parseFloat(place.y);
                    const placeLng = parseFloat(place.x);
                    return isInSupportedArea(placeLat, placeLng);
                });

                console.log('[KakaoMap] Found', results.length, 'restaurants, filtered to', filteredResults.length, 'in supported area');

                if (filteredResults.length === 0) {
                    setIsOutOfBounds(true);
                    return;
                }

                filteredResults.forEach((place) => {
                    const position = new window.kakao.maps.LatLng(
                        parseFloat(place.y),
                        parseFloat(place.x)
                    );

                    const marker = new window.kakao.maps.Marker({
                        position,
                        map: mapInstanceRef.current!,
                    });

                    // 마커 클릭 이벤트
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
                            parkingInfo: null, // 클라이언트 검색이므로 주차 정보 없음
                        };
                        onMarkerClick(kakaoPlace);
                    });

                    markersRef.current.push(marker);
                });
            } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
                console.log('[KakaoMap] No restaurants found in current view');
            }
        }, {
            bounds,
            useMapBounds: true,
        });
    }, [isLoaded, clearMarkers, onMarkerClick]);

    // 지도 이동 시 검색 (debounce)
    const handleMapIdle = useCallback(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            searchPlacesInBounds();
        }, 300); // 300ms debounce
    }, [searchPlacesInBounds]);

    // 지도 초기화
    useEffect(() => {
        if (!window.kakao?.maps) {
            console.error('Kakao Maps SDK not loaded');
            return;
        }

        window.kakao.maps.load(() => {
            if (!mapRef.current) return;

            const config = DISTRICT_CONFIG[district];
            const center = new window.kakao.maps.LatLng(config.lat, config.lng);

            const map = new window.kakao.maps.Map(mapRef.current, {
                center,
                level: config.level,
            });

            // Places 서비스 초기화
            const places = new window.kakao.maps.services.Places();

            mapInstanceRef.current = map;
            placesServiceRef.current = places;

            // 지도 이동/확대 시 이벤트 등록
            window.kakao.maps.event.addListener(map, 'idle', handleMapIdle);

            setIsLoaded(true);

            // 초기 검색
            setTimeout(() => {
                searchPlacesInBounds();
            }, 500);
        });

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [district, handleMapIdle, searchPlacesInBounds]);

    // 지역 변경 시 지도 중심 이동
    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded) return;

        const config = DISTRICT_CONFIG[district];
        const center = new window.kakao.maps.LatLng(config.lat, config.lng);
        mapInstanceRef.current.panTo(center);
        mapInstanceRef.current.setLevel(config.level);
    }, [district, isLoaded]);

    // 특정 좌표로 포커스 (후보 클릭 시)
    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded || !focusCoords) return;

        const position = new window.kakao.maps.LatLng(
            parseFloat(focusCoords.y),
            parseFloat(focusCoords.x)
        );
        mapInstanceRef.current.panTo(position);
        mapInstanceRef.current.setLevel(3);
    }, [focusCoords, isLoaded]);

    return (
        <div className="relative w-full h-full">
            <div ref={mapRef} className="w-full h-full rounded-2xl" />

            {/* 로딩 오버레이 */}
            {(!isLoaded || searchingPlaces) && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-2xl pointer-events-none">
                    <div className="flex flex-col items-center gap-2">
                        <svg className="animate-spin w-8 h-8 text-indigo-500" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm text-gray-500">
                            {!isLoaded ? '지도 로딩 중...' : '주변 식당 검색 중...'}
                        </span>
                    </div>
                </div>
            )}

            {/* 지원 지역 벗어남 경고 */}
            {isLoaded && isOutOfBounds && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 rounded-2xl">
                    <div className="bg-white rounded-xl p-5 mx-4 text-center shadow-xl max-w-xs">
                        <div className="text-3xl mb-3">🚫</div>
                        <h3 className="font-bold text-gray-900 mb-2">지원 지역이 아닙니다</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            현재 <b>관악구, 영등포구, 강남구</b>만 서비스 중입니다.
                        </p>
                        <p className="text-xs text-gray-400">
                            지역 버튼을 눌러 지원 지역으로 이동하세요
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
