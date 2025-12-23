'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { placesApi, KakaoPlace } from '@/lib/api';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPlace: (place: KakaoPlace) => void;
    addedPlaceIds: string[];
    selectedDistrict: string | null;
    isInline?: boolean;
}

const CATEGORIES = ['전체', '한식', '중식', '일식', '양식', '고기', '해산물', '분식', '카페', '술집'];
const DISTRICTS = ['강남구', '관악구', '영등포구'];

export default function SearchModal({
    isOpen,
    onClose,
    onSelectPlace,
    addedPlaceIds,
    selectedDistrict: initialDistrict,
    isInline = false
}: SearchModalProps) {
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<KakaoPlace[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('전체');
    const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 포커스
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // 검색 함수
    const performSearch = async (query: string) => {
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const result = await placesApi.search(query, {});
            if (result.success && result.data) {
                setSearchResults(result.data.places);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearching(false);
        }
    };

    // 검색 디바운스
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        debounceRef.current = setTimeout(() => {
            performSearch(searchQuery);
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchQuery]);

    // 필터링된 결과
    const filteredResults = searchResults.filter(place => {
        if (selectedDistrict && !place.address.includes(selectedDistrict)) {
            return false;
        }
        if (selectedCategory !== '전체') {
            if (!place.category?.includes(selectedCategory) && !place.categoryDetail?.includes(selectedCategory)) {
                return false;
            }
        }
        return true;
    });

    const handleSelectPlace = (place: KakaoPlace) => {
        if (addedPlaceIds.includes(place.placeId)) return;
        onSelectPlace(place);
        if (!isInline) {
            onClose();
        }
    };

    // 검색 UI 콘텐츠
    const searchContent = (
        <>
            {/* 검색 입력 */}
            <div className={isInline ? 'mb-3' : 'px-5 py-3 border-b border-gray-100'}>
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="가게 이름, 지역 이름, 메뉴 등"
                        className="input-field py-3 pr-10"
                    />
                    {searching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <svg className="animate-spin w-5 h-5 text-indigo-500" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            {/* 필터 */}
            <div className={isInline ? 'mb-3 space-y-2' : 'px-5 py-3 border-b border-gray-100 space-y-2'}>
                {/* 지역 필터 */}
                <div className="flex gap-2 flex-wrap">
                    {DISTRICTS.map((district) => (
                        <button
                            key={district}
                            onClick={() => setSelectedDistrict(selectedDistrict === district ? null : district)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedDistrict === district
                                ? 'bg-indigo-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            📍 {district}
                        </button>
                    ))}
                </div>

                {/* 카테고리 필터 */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedCategory === cat
                                ? 'bg-indigo-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* 검색 결과 */}
            <div className={isInline ? 'max-h-[300px] overflow-y-auto rounded-lg border border-gray-200' : 'flex-1 overflow-y-auto'}>
                {searchQuery.length < 2 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <span className="text-3xl mb-2">🍽️</span>
                        <p className="text-sm text-center">검색어를 2글자 이상 입력해주세요</p>
                    </div>
                ) : filteredResults.length === 0 && !searching ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <span className="text-3xl mb-2">😢</span>
                        <p className="text-sm text-center">검색 결과가 없습니다</p>
                    </div>
                ) : (
                    filteredResults.map((place) => {
                        const isAdded = addedPlaceIds.includes(place.placeId);
                        return (
                            <button
                                key={place.placeId}
                                onClick={() => handleSelectPlace(place)}
                                disabled={isAdded}
                                className={`w-full p-3 text-left border-b border-gray-100 transition-colors ${isAdded ? 'bg-gray-50 opacity-60' : 'hover:bg-indigo-50'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">
                                        {place.category === '음식점' ? '🍽️' :
                                            place.category === '카페' ? '☕' :
                                                place.category === '술집' ? '🍺' : '📍'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900 truncate text-sm">{place.name}</p>
                                            {isAdded && (
                                                <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                                                    추가됨
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{place.address}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-indigo-500">{place.category}</span>
                                            {place.parkingInfo?.hasEnoughData && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${place.parkingInfo.successRate !== null && place.parkingInfo.successRate >= 0.7
                                                    ? 'bg-green-50 border-green-200 text-green-700'
                                                    : place.parkingInfo.successRate !== null && place.parkingInfo.successRate >= 0.4
                                                        ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                                                        : 'bg-red-50 border-red-200 text-red-700'
                                                    }`}>
                                                    🅿️ {Math.round((place.parkingInfo.successRate || 0) * 100)}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </>
    );

    // 인라인 모드: 래퍼 없이 콘텐츠만 반환
    if (isInline) {
        return searchContent;
    }

    // 모달 모드
    if (!mounted) return null;

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`fixed inset-x-4 top-[5vh] bottom-[5vh] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-[70] bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                    }`}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">🔎 식당 검색해서 추가</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {searchContent}
            </div>
        </>,
        document.body
    );
}
