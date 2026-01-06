'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import classNames from 'classnames';
import { KakaoPlace } from '@/lib/api';
import { isCoreRegionByAddress } from '@/lib/utils';
import type { RegionStatus } from '@/types';
import styles from './PlaceBottomSheet.module.css';

interface PlaceBottomSheetProps {
    place: KakaoPlace | null;
    isOpen: boolean;
    onClose: () => void;
    onAddPlace: (place: KakaoPlace) => void;
    isAlreadyAdded: boolean;
    regionStatus?: RegionStatus;  // 지역 상태 (CORE만 주차 정보 표시)
}

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
    isAlreadyAdded,
    regionStatus  // 기본값 제거, 주소 기반 판별 사용
}: PlaceBottomSheetProps) {
    // 실제 적용할 지역 상태: prop이 CORE면 CORE, 아니면 주소 기반 판별
    const effectiveRegionStatus: RegionStatus =
        regionStatus === 'CORE'
            ? 'CORE'
            : (place && isCoreRegionByAddress(place.address) ? 'CORE' : 'OPEN');
    const [dragY, setDragY] = useState(0);
    const isDraggingRef = useRef(false);
    const startYRef = useRef(0);
    const dragYRef = useRef(0);
    const sheetRef = useRef<HTMLDivElement>(null);

    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        startYRef.current = e.touches[0].clientY;
        isDraggingRef.current = true;
        dragYRef.current = 0;
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isDraggingRef.current) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startYRef.current;

        if (diff > 0) {
            dragYRef.current = diff;
            setDragY(diff);
            e.preventDefault();
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        isDraggingRef.current = false;
        if (dragYRef.current > 80) {
            onCloseRef.current();
        }
        dragYRef.current = 0;
        setDragY(0);
    }, []);

    useEffect(() => {
        const sheet = sheetRef.current;
        if (!sheet || !isOpen) return;

        sheet.addEventListener('touchstart', handleTouchStart, { passive: true });
        sheet.addEventListener('touchmove', handleTouchMove, { passive: false });
        sheet.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            sheet.removeEventListener('touchstart', handleTouchStart);
            sheet.removeEventListener('touchmove', handleTouchMove);
            sheet.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isOpen, handleTouchStart, handleTouchMove, handleTouchEnd]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.overscrollBehavior = 'none';

            return () => {
                document.body.style.overflow = '';
                document.body.style.overscrollBehavior = '';
            };
        }
    }, [isOpen]);

    if (!place) return null;

    const parkingBadge = getParkingBadge(place);
    const kakaoMapUrl = `https://map.kakao.com/link/map/${place.placeId}`;

    const getParkingBadgeClass = () => {
        switch (parkingBadge.color) {
            case 'green': return styles.parkingBadgeGreen;
            case 'yellow': return styles.parkingBadgeYellow;
            case 'red': return styles.parkingBadgeRed;
            default: return styles.parkingBadgeGray;
        }
    };

    return (
        <>
            <div
                className={classNames(styles.backdrop, { [styles.backdropHidden]: !isOpen })}
                onClick={onClose}
            />

            <div
                ref={sheetRef}
                className={classNames(styles.sheet, {
                    [styles.sheetAnimated]: dragY === 0,
                    [styles.sheetHidden]: !isOpen,
                })}
                style={{
                    transform: isOpen ? `translateY(${dragY}px)` : 'translateY(100%)',
                }}
            >
                <div className={styles.handle}>
                    <div className={styles.handleBar} />
                </div>

                <div className={styles.content}>
                    <div className={styles.header}>
                        <div className={styles.headerInfo}>
                            <h3 className={styles.title}>{place.name}</h3>
                            <p className={styles.address}>{place.address}</p>
                        </div>
                        <button onClick={onClose} className={styles.closeBtn}>
                            <svg className={styles.closeIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className={styles.categoryRow}>
                        <span className={styles.categoryBadge}>{place.category}</span>
                        {place.categoryDetail && (
                            <span className={styles.categoryDetail}>{place.categoryDetail}</span>
                        )}
                    </div>

                    <div className={styles.parkingSection}>
                        <div className={styles.parkingHeader}>
                            <span className={styles.parkingTitle}>🚗 Babmoa 주차 정보</span>
                            <span className={styles.referenceTag}>참고용</span>
                        </div>

                        {effectiveRegionStatus === 'CORE' ? (
                            <>
                                <div className={styles.parkingBadgeRow}>
                                    <span className={classNames(styles.parkingBadge, getParkingBadgeClass())}>
                                        {parkingBadge.emoji} {parkingBadge.label}
                                    </span>

                                    {place.parkingInfo?.hasEnoughData && (
                                        <span className={styles.parkingStats}>
                                            성공률 {Math.round((place.parkingInfo.successRate || 0) * 100)}% ·
                                            방문자 {place.parkingInfo.recordCount}명 기준
                                        </span>
                                    )}
                                </div>

                                {!place.parkingInfo?.hasEnoughData && (
                                    <p className={styles.parkingHint}>
                                        아직 주차 기록이 충분하지 않아요. 방문 후 기록해주세요!
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className={styles.parkingHint}>
                                주차 정보는 실제 방문 기록을 기반으로 제공되며, 지역 및 장소에 따라 표시되지 않을 수 있습니다.
                            </p>
                        )}
                    </div>

                    <a
                        href={kakaoMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.kakaoBtn}
                    >
                        <svg className={styles.kakaoIcon} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                        </svg>
                        카카오맵에서 보기
                    </a>

                    <button
                        onClick={() => !isAlreadyAdded && onAddPlace(place)}
                        disabled={isAlreadyAdded}
                        className={classNames(
                            styles.addBtn,
                            isAlreadyAdded ? styles.addBtnDisabled : styles.addBtnPrimary
                        )}
                    >
                        {isAlreadyAdded ? '✓ 이미 추가됨' : '🗳️ 투표 후보로 추가'}
                    </button>
                </div>
            </div>
        </>
    );
}
