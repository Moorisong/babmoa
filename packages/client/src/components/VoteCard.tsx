'use client';

import { ParkingInfo } from '@/lib/api';
import { useState } from 'react';

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

    // 카테고리 상세에서 마지막 항목만 추출 (예: "음식점 > 한식 > 해장국" → "해장국")
    const displayCategory = categoryDetail
        ? categoryDetail.split(' > ').slice(-1)[0]
        : category;

    return (
        <div
            onClick={() => !disabled && onSelect(placeId)}
            className={`
                vote-card card p-4 transition-all
                ${selected ? 'card-selected !border-indigo-500 !bg-indigo-50/50' : ''}
                ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                animate-slide-up
            `}
            style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards' }}
        >
            {/* 카테고리 뱃지 */}
            <span className="inline-block px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full mb-3">
                {displayCategory}
            </span>

            {/* 장소 이름 */}
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                {name}
                {selected && (
                    <span className="text-indigo-500">✓</span>
                )}
            </h3>

            {/* 주소 */}
            <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {address}
            </p>

            {/* 주차 정보 표시 */}
            {parkingInfo && (
                <div className="mt-2">
                    {parkingInfo.hasEnoughData ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-help ${parkingInfo.successRate !== null && parkingInfo.successRate >= 0.7
                                    ? 'bg-green-50/80 border-green-200 text-green-700'
                                    : parkingInfo.successRate !== null && parkingInfo.successRate >= 0.4
                                        ? 'bg-yellow-50/80 border-yellow-200 text-yellow-700'
                                        : 'bg-red-50/80 border-red-200 text-red-700'
                                    }`}
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                            >
                                <span className="font-bold">🅿️ {Math.round((parkingInfo.successRate || 0) * 100)}%</span>
                                <span className="w-px h-3 bg-current opacity-20"></span>
                                <span className="text-[11px] opacity-90">{parkingInfo.recordCount}팀 방문</span>
                            </span>
                            <span className="text-[10px] text-gray-400 border border-gray-100 px-1.5 py-0.5 rounded bg-gray-50/50">
                                참고용
                            </span>
                        </div>
                    ) : (
                        <div className="mt-2 bg-gray-50/50 border border-gray-100 rounded-xl p-3 text-center">
                            <p className="text-xs text-gray-400 mb-0.5">아직 주차 기록이 충분하지 않아요 ☁️</p>
                            <p className="text-xs text-indigo-500 font-medium">
                                방문 후 주차 경험을 공유해주세요!
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Tooltip Content (Outside of Overflow Hidden Div) */}
            {parkingInfo?.hasEnoughData && showTooltip && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 pointer-events-none z-50"
                >
                    <div className="bg-gray-800 text-white text-[10px] rounded shadow-lg p-2 text-center">
                        주차 성공률은 실제 방문자들이 남긴 기록을 바탕으로 계산된 참고용 수치입니다.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                    </div>
                </div>
            )}

            {/* 투표 수 표시 */}
            {showCount && (
                <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out rounded-full"
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
                <div className="absolute top-3 right-3 w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg animate-scale-in">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
        </div>
    );
}
