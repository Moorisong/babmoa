'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { KakaoPlace, ParkingInfo, RegionStatus } from '@/types';
import { placesApi } from '@/lib/api';
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
interface CustomOverlayOptions { content: HTMLElement | string; position: LatLng; xAnchor?: number; yAnchor?: number; zIndex?: number; }
interface Marker { setMap: (map: KakaoMapInstance | null) => void; getPosition: () => LatLng; }
interface InfoWindow { open: (map: KakaoMapInstance, marker: Marker) => void; close: () => void; }
interface CustomOverlay { setMap: (map: KakaoMapInstance | null) => void; }
interface KakaoMapInstance { setCenter: (latlng: LatLng) => void; setLevel: (level: number) => void; getLevel: () => number; getCenter: () => LatLng; getBounds: () => LatLngBounds; panTo: (latlng: LatLng) => void; }
interface PlacesService { keywordSearch: (keyword: string, callback: (result: PlaceResult[], status: string, pagination: Pagination) => void, options?: PlaceSearchOptions) => void; categorySearch: (categoryCode: string, callback: (result: PlaceResult[], status: string, pagination: Pagination) => void, options?: CategorySearchOptions) => void; }
interface PlaceResult { id: string; place_name: string; address_name: string; road_address_name: string; category_group_name: string; category_name: string; phone: string; x: string; y: string; }
interface Pagination { hasNextPage: boolean; nextPage: () => void; }
interface PlaceSearchOptions { location?: LatLng; radius?: number; bounds?: LatLngBounds; }
interface CategorySearchOptions { bounds?: LatLngBounds; useMapBounds?: boolean; }

// 기본 위치 (유저 위치 확인 불가 시 사용)
const DEFAULT_CENTER = { lat: 36.5, lng: 127.8 };  // 대한민국 중심부
const DEFAULT_LEVEL = 7;

interface KakaoMapProps {
    onMarkerClick: (place: KakaoPlace) => void;
    focusCoords?: { x: string; y: string } | null;
}

export default function KakaoMap({ onMarkerClick, focusCoords }: KakaoMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<KakaoMapInstance | null>(null);
    const placesServiceRef = useRef<PlacesService | null>(null);
    const markersRef = useRef<Marker[]>([]);
    const overlaysRef = useRef<CustomOverlay[]>([]);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const focusCoordsRef = useRef<{ x: string; y: string } | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLocationChecked, setIsLocationChecked] = useState(false);
    const [searchingPlaces, setSearchingPlaces] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const initialLoadCompleteRef = useRef(false);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const clearMarkers = useCallback(() => {
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
        overlaysRef.current.forEach(overlay => overlay.setMap(null));
        overlaysRef.current = [];
    }, []);

    const searchPlacesInBounds = useCallback(() => {
        if (!mapInstanceRef.current || !placesServiceRef.current || !isLoaded) {
            return;
        }

        setSearchingPlaces(true);
        clearMarkers();

        // 현재 지도의 실제 bounds를 사용
        const mapBounds = mapInstanceRef.current.getBounds();
        const allPlaces: PlaceResult[] = [];

        // 마커 정보를 저장해서 나중에 P 뱃지 추가할 수 있도록
        const markerInfoMap = new Map<string, { marker: Marker; position: LatLng; place: PlaceResult }>();
        // 장소별 서버 데이터 (클릭 시 참조)
        type BulkParkingInfo = { hasParking: boolean; successRate: number | null; badge: string | null };
        const placeDataMap = new Map<string, { regionStatus: RegionStatus; parkingInfo: BulkParkingInfo | null }>();

        const displayMarkers = () => {
            try {
                // 1. 마커 먼저 즉시 표시
                allPlaces.forEach((place) => {
                    const position = new window.kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x));
                    const marker = new window.kakao.maps.Marker({ position, map: mapInstanceRef.current! });

                    // 마커 클릭 이벤트 (placeDataMap에서 최신 데이터 참조)
                    window.kakao.maps.event.addListener(marker, 'click', () => {
                        const data = placeDataMap.get(place.id);
                        const kakaoPlace: KakaoPlace = {
                            placeId: place.id,
                            name: place.place_name,
                            address: place.road_address_name || place.address_name,
                            category: place.category_group_name || '음식점',
                            categoryDetail: place.category_name,
                            phone: place.phone,
                            x: place.x,
                            y: place.y,
                            parkingInfo: (data?.parkingInfo || null) as ParkingInfo | null,
                            regionStatus: data?.regionStatus || 'OPEN'
                        };
                        onMarkerClick(kakaoPlace);
                    });

                    markersRef.current.push(marker);
                    markerInfoMap.set(place.id, { marker, position, place });
                });

                // 2. 백그라운드에서 Bulk Info Fetch 후 P 뱃지 추가 (대구·경산만 조회)
                fetchBulkInfoAndAddBadges();
            } catch (err) {
                console.error('Error in displayMarkers:', err);
            } finally {
                setSearchingPlaces(false);
                initialLoadCompleteRef.current = true;  // 초기 로딩 완료 표시
            }
        };

        // 대구·경산 지역인지 확인
        const isDaeguGyeongsan = (address: string): boolean => {
            if (!address) return false;
            return address.includes('대구') || address.includes('경산');
        };

        const fetchBulkInfoAndAddBadges = async () => {
            try {
                // 대구·경산 지역만 필터링하여 Bulk API 요청
                const daeguGyeongsanPlaces = allPlaces
                    .filter(p => isDaeguGyeongsan(p.road_address_name || p.address_name))
                    .map(p => ({
                        placeId: p.id,
                        address: p.road_address_name || p.address_name
                    }));

                // 대구·경산 지역 장소가 없으면 API 호출 스킵
                if (daeguGyeongsanPlaces.length === 0) {
                    return;
                }

                const bulkResult = await placesApi.getBulkInfo(daeguGyeongsanPlaces);

                if (bulkResult.success && bulkResult.data?.results) {
                    bulkResult.data.results.forEach(item => {
                        // 데이터 맵 업데이트 (클릭 시 참조됨)
                        placeDataMap.set(item.placeId, {
                            regionStatus: item.regionStatus,
                            parkingInfo: item.parkingInfo || null
                        });

                        // CORE_REGION이면 P 뱃지 추가
                        if (item.regionStatus === 'CORE') {
                            const markerInfo = markerInfoMap.get(item.placeId);
                            if (markerInfo) {
                                const content = document.createElement('div');
                                content.className = styles.parkingBadge;
                                content.innerText = 'P';

                                const overlay = new window.kakao.maps.CustomOverlay({
                                    position: markerInfo.position,
                                    content,
                                    yAnchor: 2.3,
                                    zIndex: 10
                                });
                                overlay.setMap(mapInstanceRef.current!);
                                overlaysRef.current.push(overlay);
                            }
                        }
                    });
                }
            } catch (err) {
                console.error('Failed to fetch bulk info:', err);
            }
        };

        // 페이지네이션으로 여러 페이지 가져오기 (최대 3페이지)
        let currentPage = 0;
        const maxPages = 3;

        placesServiceRef.current.categorySearch('FD6', function callback(results, status, pagination) {
            try {
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
            } catch (err) {
                console.error('Error in categorySearch callback:', err);
                setSearchingPlaces(false);
            }
        }, { bounds: mapBounds });
    }, [isLoaded, clearMarkers, onMarkerClick]);

    const handleMapIdle = useCallback(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            searchPlacesInBounds();
        }, 300);
    }, [searchPlacesInBounds]);

    // idle 이벤트 리스너 업데이트
    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded) return;

        const map = mapInstanceRef.current;
        window.kakao.maps.event.removeListener(map, 'idle', handleMapIdle);
        window.kakao.maps.event.addListener(map, 'idle', handleMapIdle);

        return () => {
            window.kakao.maps.event.removeListener(map, 'idle', handleMapIdle);
        };
    }, [handleMapIdle, isLoaded]);

    // 지도 초기화 - 유저 위치 기반 (Geolocation 최우선)
    useEffect(() => {
        if (!window.kakao?.maps) return;

        window.kakao.maps.load(() => {
            if (!mapRef.current) return;

            // 초기 지도 생성 (기본 위치)
            const center = new window.kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
            const map = new window.kakao.maps.Map(mapRef.current, {
                center,
                level: DEFAULT_LEVEL,
                maxLevel: 10
            });
            const places = new window.kakao.maps.services.Places();

            mapInstanceRef.current = map;
            placesServiceRef.current = places;

            setIsLoaded(true);

            // 유저 위치로 이동 (Geolocation API 사용)
            if ('geolocation' in navigator) {
                const getLocation = (options: PositionOptions): Promise<GeolocationPosition> => {
                    return new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, options);
                    });
                };

                const handleSuccess = (position: GeolocationPosition) => {
                    const userCenter = new window.kakao.maps.LatLng(
                        position.coords.latitude,
                        position.coords.longitude
                    );
                    map.setCenter(userCenter);
                    map.setLevel(5);
                    searchPlacesInBounds();
                    setIsLocationChecked(true);
                };

                const handleError = (err: GeolocationPositionError, isRetry = false) => {
                    console.error(`Geolocation error (${isRetry ? 'Low' : 'High'} Acc):`, err);

                    if (!isRetry) {
                        // 첫 시도(High Accuracy) 실패 시, Low Accuracy로 재시도
                        console.log('Retrying with Low Accuracy...');
                        getLocation({ enableHighAccuracy: false, timeout: 5000, maximumAge: 0 })
                            .then(handleSuccess)
                            .catch((retryErr) => handleError(retryErr, true));
                        return;
                    }

                    // 재시도까지 실패 시 에러 처리
                    let msg = '위치를 확인할 수 없어 기본 위치를 표시합니다.';
                    if (err.code === 1) {
                        msg = '위치 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.';
                    } else if (err.code === 2) {
                        msg = '현재 위치 정보를 사용할 수 없습니다.';
                    } else if (err.code === 3) {
                        msg = '위치 확인 시간이 초과되었습니다.';
                    }
                    showToast(`${msg} (E${err.code})`);
                    searchPlacesInBounds();
                    setIsLocationChecked(true);
                };

                // 1차 시도: High Accuracy (5초)
                getLocation({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 })
                    .then(handleSuccess)
                    .catch((err) => handleError(err, false));

            } else {
                console.warn('Geolocation not supported');
                setTimeout(() => {
                    showToast('브라우저가 위치 정보를 지원하지 않습니다.');
                    searchPlacesInBounds();
                    setIsLocationChecked(true);
                }, 500);
            }
        });

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);



    // focusCoords 변경 시 해당 위치로 이동
    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded || !focusCoords) return;

        focusCoordsRef.current = focusCoords;
        const position = new window.kakao.maps.LatLng(parseFloat(focusCoords.y), parseFloat(focusCoords.x));
        mapInstanceRef.current.panTo(position);
        mapInstanceRef.current.setLevel(3);
    }, [focusCoords, isLoaded]);

    return (
        <div className={styles.container}>
            <div ref={mapRef} className={styles.map} />

            {(!isLoaded || !isLocationChecked || (searchingPlaces && !initialLoadCompleteRef.current)) && (
                <div className={styles.overlay}>
                    <div className={styles.loadingContent}>
                        <svg className={styles.spinner} viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className={styles.loadingText}>
                            {!isLocationChecked ? '위치 확인 중...' : (!isLoaded ? '지도 로딩 중...' : '주변 식당 검색 중...')}
                        </span>
                    </div>
                </div>
            )}

            {toastMessage && (
                <div className={styles.toast}>
                    {toastMessage}
                </div>
            )}
        </div>
    );
}
