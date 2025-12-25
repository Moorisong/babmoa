'use client';

import { useState } from 'react';
import classNames from 'classnames';
import type { ParkingInfo } from '@/types';
import styles from './VoteCard.module.css';

interface VoteCardProps {
    placeId: string;
    name: string;
    address: string;
    category: string;
    categoryDetail?: string;
    selected: boolean;
    onSelect: (placeId: string) => void;
    voteCount?: number;
    showCount?: boolean;
    disabled?: boolean;
    index?: number;
    parkingInfo?: ParkingInfo | null;
}

export default function VoteCard({
    placeId,
    name,
    address,
    category,
    categoryDetail,
    selected,
    onSelect,
    voteCount = 0,
    showCount = false,
    disabled = false,
    index = 0,
    parkingInfo,
}: VoteCardProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    const displayCategory = categoryDetail
        ? categoryDetail.split(' > ').slice(-1)[0]
        : category;

    const getParkingBadgeClass = () => {
        if (!parkingInfo?.successRate) return styles.parkingBadgeDanger;
        if (parkingInfo.successRate >= 0.7) return styles.parkingBadgeSuccess;
        if (parkingInfo.successRate >= 0.4) return styles.parkingBadgeWarning;
        return styles.parkingBadgeDanger;
    };

    return (
        <div
            onClick={() => !disabled && onSelect(placeId)}
            className={classNames(styles.card, {
                [styles.cardSelected]: selected,
                [styles.cardDisabled]: disabled,
                [styles.cardClickable]: !disabled,
            })}
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            <span className={styles.badge}>{displayCategory}</span>

            <h3 className={styles.title}>
                {name}
                {selected && <span className={styles.checkIcon}>✓</span>}
            </h3>

            <p className={styles.address}>
                <svg className={styles.addressIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {address}
            </p>

            {parkingInfo && (
                <div className={styles.parkingSection}>
                    {parkingInfo.hasEnoughData ? (
                        <div className={styles.parkingBadgeContainer}>
                            <span
                                className={getParkingBadgeClass()}
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                            >
                                <span style={{ fontWeight: 700 }}>🅿️ {Math.round((parkingInfo.successRate || 0) * 100)}%</span>
                                <span className={styles.parkingDivider}></span>
                                <span className={styles.parkingCount}>{parkingInfo.recordCount}팀 방문</span>
                            </span>
                            <span className={styles.referenceTag}>참고용</span>
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <p className={styles.emptyText}>아직 주차 기록이 충분하지 않아요 ☁️</p>
                            <p className={styles.emptyHint}>방문 후 주차 경험을 공유해주세요!</p>
                        </div>
                    )}
                </div>
            )}

            {parkingInfo?.hasEnoughData && showTooltip && (
                <div className={styles.tooltip}>
                    <div className={styles.tooltipContent}>
                        주차 성공률은 실제 방문자들이 남긴 기록을 바탕으로 계산된 참고용 수치입니다.
                        <div className={styles.tooltipArrow}></div>
                    </div>
                </div>
            )}

            {showCount && (
                <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${Math.min(voteCount * 20, 100)}%` }}
                        />
                    </div>
                    <span className={styles.voteCount}>{voteCount}표</span>
                </div>
            )}

            {selected && (
                <div className={styles.selectionIndicator}>
                    <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
        </div>
    );
}
