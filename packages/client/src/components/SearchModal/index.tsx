'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { placesApi, KakaoPlace } from '@/lib/api';
import styles from './SearchModal.module.css';

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

    useEffect(() => {
        if (isOpen && inputRef.current && !isInline) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, isInline]);

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

    const getParkingBadgeClass = (successRate: number | null) => {
        if (successRate === null) return styles.parkingDanger;
        if (successRate >= 0.7) return styles.parkingSuccess;
        if (successRate >= 0.4) return styles.parkingWarning;
        return styles.parkingDanger;
    };

    const getPlaceEmoji = (category: string) => {
        if (category === '음식점') return '🍽️';
        if (category === '카페') return '☕';
        if (category === '술집') return '🍺';
        return '📍';
    };

    const searchContent = (
        <>
            <div className={isInline ? styles.inputWrapper : `${styles.inputWrapper} px-5 py-3 border-b border-gray-100`}>
                <div className={styles.inputContainer}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="가게 이름, 지역 이름, 메뉴 등"
                        className={styles.input}
                    />
                    {searching && (
                        <div className={styles.spinner}>
                            <svg className={styles.spinnerIcon} viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            <div className={isInline ? styles.filtersSection : styles.filtersModal}>
                <div className={styles.districtFilters}>
                    {DISTRICTS.map((district) => (
                        <button
                            key={district}
                            onClick={() => setSelectedDistrict(selectedDistrict === district ? null : district)}
                            className={selectedDistrict === district ? styles.filterBtnActive : styles.filterBtnInactive}
                        >
                            📍 {district}
                        </button>
                    ))}
                </div>

                <div className={styles.categoryFilters}>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={selectedCategory === cat ? styles.categoryBtnActive : styles.categoryBtnInactive}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className={isInline ? styles.resultsInline : styles.resultsModal}>
                {searchQuery.length < 2 ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyEmoji}>🍽️</span>
                        <p className={styles.emptyText}>검색어를 2글자 이상 입력해주세요</p>
                    </div>
                ) : filteredResults.length === 0 && !searching ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyEmoji}>😢</span>
                        <p className={styles.emptyText}>검색 결과가 없습니다</p>
                    </div>
                ) : (
                    filteredResults.map((place) => {
                        const isAdded = addedPlaceIds.includes(place.placeId);
                        return (
                            <button
                                key={place.placeId}
                                onClick={() => handleSelectPlace(place)}
                                disabled={isAdded}
                                className={styles.resultItem}
                            >
                                <div className={styles.resultContent}>
                                    <span className={styles.resultEmoji}>{getPlaceEmoji(place.category)}</span>
                                    <div className={styles.resultInfo}>
                                        <div className={styles.resultHeader}>
                                            <p className={styles.resultName}>{place.name}</p>
                                            {isAdded && <span className={styles.addedBadge}>추가됨</span>}
                                        </div>
                                        <p className={styles.resultAddress}>{place.address}</p>
                                        <div className={styles.resultMeta}>
                                            <span className={styles.resultCategory}>{place.category}</span>
                                            {place.parkingInfo?.hasEnoughData && (
                                                <span className={classNames(
                                                    styles.parkingBadge,
                                                    getParkingBadgeClass(place.parkingInfo.successRate)
                                                )}>
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

    if (isInline) {
        return searchContent;
    }

    if (!mounted) return null;

    return createPortal(
        <>
            <div
                className={classNames(styles.backdrop, { [styles.backdropHidden]: !isOpen })}
                onClick={onClose}
            />

            <div className={classNames(styles.modal, { [styles.modalHidden]: !isOpen })}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>🔎 식당 검색해서 추가</h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <svg className={styles.closeIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
