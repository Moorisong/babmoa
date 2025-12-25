'use client';

import { useState } from 'react';
import type { ParkingInfo } from '@/types';

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

    // 카테고리 상세에서 마지막 항목만 추출
    const displayCategory = categoryDetail
        ? categoryDetail.split(' > ').slice(-1)[0]
        : category;

    // 주차 뱃지 클래스 결정
    const getParkingBadgeClass = () => {
        if (!parkingInfo?.successRate) return 'parking-badge-danger';
        if (parkingInfo.successRate >= 0.7) return 'parking-badge-success';
        if (parkingInfo.successRate >= 0.4) return 'parking-badge-warning';
        return 'parking-badge-danger';
    };

    return (
        <div
            onClick={() => !disabled && onSelect(placeId)}
            className={`
                vote-card card p-4 transition-all animate-slide-up
                ${selected ? 'card-selected !border-indigo-500 !bg-indigo-50/50' : ''}
                ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards' }}
        >
            {/* 카테고리 뱃지 */}
            <span className="badge-primary mb-3">{displayCategory}</span>

            {/* 장소 이름 */}
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-sm">
                {name}
                {selected && <span className="text-indigo-500">✓</span>}
            </h3>

            {/* 주소 */}
            <p className="text-caption flex items-center gap-xs mb-2">
                <svg className="icon-sm text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {address}
            </p>

            {/* 주차 정보 표시 */}
            {parkingInfo && (
                <div className="mt-2">
                    {parkingInfo.hasEnoughData ? (
                        <div className="flex flex-wrap items-center gap-sm">
                            <span
                                className={getParkingBadgeClass()}
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                            >
                                <span className="font-bold">🅿️ {Math.round((parkingInfo.successRate || 0) * 100)}%</span>
                                <span className="w-px h-3 bg-current opacity-20"></span>
                                <span className="text-[11px] opacity-90">{parkingInfo.recordCount}팀 방문</span>
                            </span>
                            <span className="text-[10px] text-muted border border-gray-100 px-1.5 py-0.5 rounded bg-gray-50/50">
                                참고용
                            </span>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p className="text-xs text-muted mb-0.5">아직 주차 기록이 충분하지 않아요 ☁️</p>
                            <p className="text-xs text-indigo-500 font-medium">
                                방문 후 주차 경험을 공유해주세요!
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* 툴팁 */}
            {parkingInfo?.hasEnoughData && showTooltip && (
                <div className="tooltip w-48">
                    <div className="tooltip-content">
                        주차 성공률은 실제 방문자들이 남긴 기록을 바탕으로 계산된 참고용 수치입니다.
                        <div className="tooltip-arrow"></div>
                    </div>
                </div>
            )}

            {/* 투표 수 표시 */}
            {showCount && (
                <div className="mt-4 flex items-center gap-md">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${Math.min(voteCount * 20, 100)}%` }}
                        />
                    </div>
                    <span className="text-sm font-bold text-indigo-600 min-w-[3rem] text-right">
                        {voteCount}표
                    </span>
                </div>
            )}

            {/* 선택 인디케이터 */}
            {selected && (
                <div className="selection-indicator">
                    <svg className="icon-sm text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
        </div>
    );
}
