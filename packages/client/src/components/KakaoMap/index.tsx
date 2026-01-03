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
    '대구시': { lat: 35.8714, lng: 128.6014, level: 6 },
    '경산시': { lat: 35.8247, lng: 128.7411, level: 6 },
};

const DISTRICT_BOUNDS = {
    // 주소 기반 필터링을 사용하므로 경계를 넓게 설정
    // 실제 필터링은 주소에 "대구" 또는 "경산"이 포함되는지로 판단
    '대구시': { south: 35.60, north: 36.02, west: 128.35, east: 128.80 },
    '경산시': { south: 35.75, north: 35.92, west: 128.68, east: 128.85 },
};

const isInDistrict = (lat: number, lng: number, bounds: { south: number; north: number; west: number; east: number }): boolean => {
    return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
};

const isInSupportedArea = (lat: number, lng: number): boolean => {
    return isInDistrict(lat, lng, DISTRICT_BOUNDS['대구시']) ||
        isInDistrict(lat, lng, DISTRICT_BOUNDS['경산시']);
};

interface KakaoMapProps {
    district: '대구시' | '경산시';
    onMarkerClick: (place: KakaoPlace) => void;
    focusCoords?: { x: string; y: string } | null;
}

export default function KakaoMap({ district, onMarkerClick, focusCoords }: KakaoMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<KakaoMapInstance | null>(null);
    const placesServiceRef = useRef<PlacesService | null>(null);
    const markersRef = useRef<Marker[]>([]);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isDistrictChangingRef = useRef(false); // 지역 변경 중 플래그
    const focusCoordsRef = useRef<{ x: string; y: string } | null>(null); // focusCoords 추적
    const [isLoaded, setIsLoaded] = useState(false);
    const [searchingPlaces, setSearchingPlaces] = useState(false);
    const [isOutOfBounds, setIsOutOfBounds] = useState(false);

    const clearMarkers = useCallback(() => {
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
    }, []);

    const districtRef = useRef(district);
    useEffect(() => {
        districtRef.current = district;
    }, [district]);

    const searchPlacesInBounds = useCallback(() => {
        const currentDistrict = districtRef.current;

        if (!mapInstanceRef.current || !placesServiceRef.current || !isLoaded) {
            return;
        }

        const center = mapInstanceRef.current.getCenter();
        const centerLat = center.getLat();
        const centerLng = center.getLng();

        // 현재 선택된 구의 경계만 확인
        const currentDistrictBounds = DISTRICT_BOUNDS[currentDistrict];
        if (!isInDistrict(centerLat, centerLng, currentDistrictBounds)) {
            setIsOutOfBounds(true);
            clearMarkers();
            setSearchingPlaces(false);
            return;
        }

        setIsOutOfBounds(false);
        setSearchingPlaces(true);
        clearMarkers();

        // 현재 지도의 실제 bounds를 사용 (더 많은 결과를 위해)
        const mapBounds = mapInstanceRef.current.getBounds();
        const allPlaces: PlaceResult[] = [];

        const displayMarkers = () => {
            setSearchingPlaces(false);

            // 주소 기반으로 필터링 (좌표가 아닌 행정구역 기준)
            const districtKeywords: Record<string, string[]> = {
                '대구시': ['대구', '대구광역시'],
                '경산시': ['경산', '경산시']
            };

            const keywords = districtKeywords[currentDistrict] || [];
            const filteredResults = allPlaces.filter(place => {
                const address = place.road_address_name || place.address_name;
                return keywords.some(keyword => address.includes(keyword));
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
        };

        // 페이지네이션으로 여러 페이지 가져오기 (최대 3페이지)
        let currentPage = 0;
        const maxPages = 3;

        placesServiceRef.current.categorySearch('FD6', function callback(results, status, pagination) {
            if (status === window.kakao.maps.services.Status.OK) {
                currentPage++;
                allPlaces.push(...results);

                // 다음 페이지가 있고, maxPages 이하이면 계속 가져오기
                if (pagination.hasNextPage && currentPage < maxPages) {
                    pagination.nextPage();
                } else {
                    // 모든 페이지를 가져왔으면 마커 표시
                    displayMarkers();
                }
            } else {
                setSearchingPlaces(false);
            }
        }, { bounds: mapBounds });
    }, [isLoaded, clearMarkers, onMarkerClick]);

    const handleMapIdle = useCallback(() => {
        // 지역 변경 중이면 idle 이벤트 무시
        if (isDistrictChangingRef.current) {
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            searchPlacesInBounds();
        }, 300);
    }, [searchPlacesInBounds]);

    // idle 이벤트 리스너 업데이트 (handleMapIdle이 변경될 때마다)
    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded) return;

        const map = mapInstanceRef.current;

        // 기존 리스너 제거 후 새로 등록
        window.kakao.maps.event.removeListener(map, 'idle', handleMapIdle);
        window.kakao.maps.event.addListener(map, 'idle', handleMapIdle);

        return () => {
            window.kakao.maps.event.removeListener(map, 'idle', handleMapIdle);
        };
    }, [handleMapIdle, isLoaded]);

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

            setIsLoaded(true);

            setTimeout(() => {
                searchPlacesInBounds();
            }, 500);
        });

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 최초 마운트 시에만 실행

    const prevDistrictRef = useRef(district);

    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded) return;

        // 지역 변경 중 플래그 설정 (idle 이벤트 무시하기 위함)
        isDistrictChangingRef.current = true;

        // district 변경 시 진행 중인 검색 타임아웃 취소
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = null;
        }

        // 기존 마커 제거 및 검색 상태 초기화
        clearMarkers();
        setSearchingPlaces(false);

        const config = DISTRICT_CONFIG[district];
        const center = new window.kakao.maps.LatLng(config.lat, config.lng);

        // 지역이 실제로 변경된 경우에만 지도 이동 및 상태 리셋
        if (prevDistrictRef.current !== district) {
            // 실제 district 변경 시에만 isOutOfBounds 리셋 (focusCoords 변경 시에는 리셋하지 않음)
            setIsOutOfBounds(false);

            // focusCoords가 설정되어 있으면 중심 이동 스킵 (어차피 곧 특정 위치로 포커스됨)
            if (!focusCoords) {
                mapInstanceRef.current.panTo(center);
                mapInstanceRef.current.setLevel(config.level);
            }
            prevDistrictRef.current = district;
        }

        // 새로운 지역의 장소 검색 (지역 변경 완료 후)
        setTimeout(() => {
            searchPlacesInBounds();
            // 검색 완료 후 플래그 해제
            setTimeout(() => {
                isDistrictChangingRef.current = false;
            }, 1000);
        }, 500);
    }, [district, isLoaded, clearMarkers, searchPlacesInBounds, focusCoords]);

    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded || !focusCoords) return;

        // focusCoordsRef 업데이트
        focusCoordsRef.current = focusCoords;

        // 지역 변경 중이면 대기
        const applyFocus = () => {
            if (isDistrictChangingRef.current) {
                setTimeout(applyFocus, 100);
                return;
            }
            const position = new window.kakao.maps.LatLng(parseFloat(focusCoords.y), parseFloat(focusCoords.x));
            mapInstanceRef.current!.panTo(position);
            mapInstanceRef.current!.setLevel(3);
        };

        applyFocus();
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
                            현재 <b>대구시, 경산시</b>만 서비스 중입니다.
                        </p>
                        <p className={styles.outOfBoundsHint}>지역 버튼을 눌러 지원 지역으로 이동하세요</p>
                    </div>
                </div>
            )}
        </div>
    );
}
