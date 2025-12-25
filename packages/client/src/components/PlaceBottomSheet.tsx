'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { KakaoPlace } from '@/lib/api';

interface PlaceBottomSheetProps {
    place: KakaoPlace | null;
    isOpen: boolean;
    onClose: () => void;
    onAddPlace: (place: KakaoPlace) => void;
    isAlreadyAdded: boolean;
}

// 주차 뱃지 계산
function getParkingBadge(place: KakaoPlace) {
    if (!place.parkingInfo || !place.parkingInfo.hasEnoughData) {
        return { label: '주차 정보 부족', color: 'gray', emoji: '☁️' };
    }

    const rate = place.parkingInfo.successRate || 0;

    if (rate >= 0.7) {
        return { label: '주차 수월', color: 'green', emoji: '🅿️' };
    } else if (rate >= 0.4) {
        return { label: '애매함', color: 'yellow', emoji: '🅿️' };
    } else {
        return { label: '거의 불가', color: 'red', emoji: '🅿️' };
    }
}

export default function PlaceBottomSheet({
    place,
    isOpen,
    onClose,
    onAddPlace,
    isAlreadyAdded
}: PlaceBottomSheetProps) {
    const [dragY, setDragY] = useState(0);
    const isDraggingRef = useRef(false);
    const startYRef = useRef(0);
    const dragYRef = useRef(0);
    const sheetRef = useRef<HTMLDivElement>(null);

    const onCloseRef = useRef(onClose);

    // onClose가 변경될 때 ref 업데이트 (렌더링 중 ref 업데이트 방지)
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // 터치 핸들러들을 useCallback으로 메모이제이션
    const handleTouchStart = useCallback((e: TouchEvent) => {
        startYRef.current = e.touches[0].clientY;
        isDraggingRef.current = true;
        dragYRef.current = 0;
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isDraggingRef.current) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startYRef.current;

        // 아래로만 드래그 가능
        if (diff > 0) {
            dragYRef.current = diff;
            setDragY(diff);
            // pull-to-refresh 방지 (passive: false로 등록해야 작동)
            e.preventDefault();
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        isDraggingRef.current = false;
        // 80px 이상 드래그하면 닫기
        if (dragYRef.current > 80) {
            onCloseRef.current();
        }
        dragYRef.current = 0;
        setDragY(0);
    }, []);

    // 전체 시트에 passive: false 터치 이벤트 등록
    useEffect(() => {
        const sheet = sheetRef.current;
        if (!sheet || !isOpen) return;

        // { passive: false }로 등록해야 preventDefault() 작동
        sheet.addEventListener('touchstart', handleTouchStart, { passive: true });
        sheet.addEventListener('touchmove', handleTouchMove, { passive: false });
        sheet.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            sheet.removeEventListener('touchstart', handleTouchStart);
            sheet.removeEventListener('touchmove', handleTouchMove);
            sheet.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isOpen, handleTouchStart, handleTouchMove, handleTouchEnd]);

    // 바텀시트 열릴 때 전체 페이지 스크롤 & pull-to-refresh 방지
    useEffect(() => {
        if (isOpen) {
            // body 스크롤 막기
            document.body.style.overflow = 'hidden';
            document.body.style.overscrollBehavior = 'none';
            // 터치 이벤트가 document로 전파되는 것을 막기
            const preventPullToRefresh = (e: TouchEvent) => {
                // 시트가 열려있을 때만
                if (sheetRef.current?.contains(e.target as Node)) {
                    return;
                }
            };
            document.addEventListener('touchmove', preventPullToRefresh, { passive: false });

            return () => {
                document.body.style.overflow = '';
                document.body.style.overscrollBehavior = '';
                document.removeEventListener('touchmove', preventPullToRefresh);
            };
        }
    }, [isOpen]);

    if (!place) return null;

    const parkingBadge = getParkingBadge(place);
    const kakaoMapUrl = `https://map.kakao.com/link/map/${place.placeId}`;

    const badgeColorClasses = {
        green: 'bg-green-50 border-green-200 text-green-700',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        gray: 'bg-gray-50 border-gray-200 text-gray-400',
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div
                ref={sheetRef}
                className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl ${dragY > 0 ? '' : 'transition-transform duration-300 ease-out'} ${isOpen ? '' : 'translate-y-full'
                    }`}
                style={{
                    maxHeight: '70vh',
                    transform: isOpen ? `translateY(${dragY}px)` : 'translateY(100%)',
                    touchAction: 'none', // 브라우저 기본 터치 동작 비활성화
                }}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                <div
                    className="px-5 pb-6 overflow-y-auto"
                    style={{ maxHeight: 'calc(70vh - 40px)' }}
                >
                    {/* 헤더 */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0 pr-4">
                            <h3 className="text-xl font-bold text-gray-900 truncate">{place.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{place.address}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                        >
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* 카테고리 */}
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">
                            {place.category}
                        </span>
                        {place.categoryDetail && (
                            <span className="text-xs text-gray-400">{place.categoryDetail}</span>
                        )}
                    </div>

                    {/* Babmoa 주차 정보 */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-gray-700">🚗 Babmoa 주차 정보</span>
                            <span className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-400">
                                참고용
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${badgeColorClasses[parkingBadge.color as keyof typeof badgeColorClasses]}`}>
                                {parkingBadge.emoji} {parkingBadge.label}
                            </span>

                            {place.parkingInfo?.hasEnoughData && (
                                <span className="text-xs text-gray-500">
                                    성공률 {Math.round((place.parkingInfo.successRate || 0) * 100)}% ·
                                    방문자 {place.parkingInfo.recordCount}명 기준
                                </span>
                            )}
                        </div>

                        {!place.parkingInfo?.hasEnoughData && (
                            <p className="text-xs text-gray-400 mt-2">
                                아직 주차 기록이 충분하지 않아요. 방문 후 기록해주세요!
                            </p>
                        )}
                    </div>

                    {/* 카카오맵 링크 */}
                    <a
                        href={kakaoMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 mb-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-medium rounded-xl transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                        </svg>
                        카카오맵에서 보기
                    </a>

                    {/* 투표 후보 추가 버튼 */}
                    <button
                        onClick={() => !isAlreadyAdded && onAddPlace(place)}
                        disabled={isAlreadyAdded}
                        className={`w-full py-3.5 rounded-xl font-semibold transition-all ${isAlreadyAdded
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'btn-primary'
                            }`}
                    >
                        {isAlreadyAdded ? '✓ 이미 추가됨' : '🗳️ 투표 후보로 추가'}
                    </button>
                </div>
            </div>
        </>
    );
}
