'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import classNames from 'classnames';
import { Header, LinkShare, DateTimePicker, PlaceBottomSheet, SearchModal } from '@/components';
import { ROUTES, CONFIG } from '@/constants';
import { roomsApi } from '@/lib/api';
import type { KakaoPlace, Place, RegionStatus } from '@/types';
import { canCreateRoom, getRoomCreationCooldownRemaining, setRoomCreatedAt, getParticipantId } from '@/lib/utils';
import styles from './page.module.css';

const KakaoMap = dynamic(() => import('@/components/KakaoMap').then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <div className={styles.mapLoadingContent}>
        <svg className={styles.mapLoadingSpinner} viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className={styles.mapLoadingText}>지도 로딩 중...</span>
      </div>
    </div>
  )
});

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [allowPass, setAllowPass] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);



  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null);
  const [selectedRegionStatus, setSelectedRegionStatus] = useState<RegionStatus>('OPEN');  // 선택된 장소의 지역 상태
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(true);
  const [focusCoords, setFocusCoords] = useState<{ x: string; y: string } | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ show: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleMarkerClick = useCallback((place: KakaoPlace) => {
    setSelectedPlace(place);
    setSelectedRegionStatus(place.regionStatus || 'OPEN');  // 지역 상태 설정
    setIsBottomSheetOpen(true);
  }, []);

  const handleAddPlace = (kakaoPlace: KakaoPlace) => {
    if (places.some(p => p.placeId === kakaoPlace.placeId)) {
      showToast('이미 추가된 장소입니다');
      return;
    }

    const newPlace: Place = {
      placeId: kakaoPlace.placeId,
      name: kakaoPlace.name,
      address: kakaoPlace.address,
      category: kakaoPlace.category || '음식점',
      categoryDetail: kakaoPlace.categoryDetail,
      x: kakaoPlace.x,
      y: kakaoPlace.y,
    };

    setPlaces([...places, newPlace]);
    setIsBottomSheetOpen(false);
    showToast(`'${kakaoPlace.name}' 추가됨!`, 'success');
  };

  const handleRemovePlace = (placeId: string) => {
    setPlaces(places.filter(p => p.placeId !== placeId));
  };

  const handleSearchSelect = (kakaoPlace: KakaoPlace) => {
    handleAddPlace(kakaoPlace);
    setIsSearchExpanded(false);
  };



  const handleSubmit = async () => {
    if (!canCreateRoom()) {
      const remaining = getRoomCreationCooldownRemaining();
      showToast(`잠시 후 다시 시도해주세요 (${remaining}초 후)`);
      return;
    }

    if (!title) {
      showToast('투표 제목을 입력해주세요');
      return;
    }

    if (places.length < 2) {
      showToast('최소 2개 이상의 장소를 선택해주세요');
      return;
    }

    if (!deadline) {
      showToast('투표 마감 시간을 설정해주세요');
      return;
    }

    if (new Date(deadline) <= new Date()) {
      showToast('마감 시간은 현재 시간 이후로 설정해주세요');
      return;
    }

    setLoading(true);
    try {
      const result = await roomsApi.create({
        title,
        places,
        options: {
          allowPass,
          deadline: new Date(deadline).toISOString(),
        },
        participantId: getParticipantId(),
      });

      if (result.success && result.data) {
        setRoomCreatedAt();
        setCreatedRoomId(result.data.roomId);
        showToast('투표방이 생성되었습니다!', 'success');
      } else {
        showToast(result.error?.message || '투표방 생성에 실패했습니다');
      }
    } catch {
      showToast('오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (createdRoomId) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const roomUrl = `${baseUrl}/room/${createdRoomId}`;

    return (
      <>
        <Header />
        <main className={styles.successMain}>
          <div className={styles.successHero}>
            <div className={styles.successCircle}>
              <svg className={styles.successIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className={styles.successTitle}>투표방 생성 완료! 🎉</h1>
            <p className={styles.successSubtitle}>아래 링크를 팀원들에게 공유하세요</p>
          </div>

          <div className={styles.linkCard} style={{ animationDelay: '0.1s' }}>
            <p className={styles.linkLabel}>📎 투표 링크</p>
            <p className={styles.linkUrl}>{roomUrl}</p>
          </div>

          <div style={{ animationDelay: '0.2s' }}>
            <LinkShare url={roomUrl} title={title} />
          </div>

          <button
            onClick={() => router.push(ROUTES.ROOM(createdRoomId))}
            className={styles.goBtn}
            style={{ animationDelay: '0.3s' }}
          >
            투표방으로 이동 →
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>
            <span className={styles.heroGradient}>오늘의 회식</span>
            <span> PICK</span>
          </h1>
          <p className={styles.heroSubtitle}>
            지도에서 식당을 찾고, <span className={styles.heroHighlight}>주차 정보</span>까지 확인하세요
          </p>
        </div>

        <div className={styles.section} style={{ animationDelay: '0.1s' }}>
          <label className={styles.sectionLabel}>📝 투표 제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 이번 달 우리팀 회식"
            className={styles.input}
          />
        </div>

        <div className={styles.section} style={{ animationDelay: '0.15s' }}>
          <label className={styles.sectionLabel}>📍 지도에서 후보 선택</label>

          <div className={styles.mapContainer}>
            <KakaoMap
              onMarkerClick={handleMarkerClick}
              focusCoords={focusCoords}
            />
          </div>

          {/* 고정 안내 문구 */}
          <p className={styles.parkingDisclaimer}>
            주차 정보는 실제 방문 기록을 기반으로 제공되며, 지역 및 장소에 따라 표시되지 않을 수 있습니다.
          </p>

          <button
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            className={classNames(styles.searchToggle, {
              [styles.searchToggleExpanded]: isSearchExpanded,
              [styles.searchToggleCollapsed]: !isSearchExpanded
            })}
          >
            <span className={styles.searchIcon}>{isSearchExpanded ? '✕' : '🔍'}</span>
            <span>{isSearchExpanded ? '검색 닫기' : '검색으로 추가'}</span>
          </button>

          {isSearchExpanded && (
            <div className={styles.inlineSearch}>
              <SearchModal
                isOpen={true}
                onClose={() => setIsSearchExpanded(false)}
                onSelectPlace={handleSearchSelect}
                addedPlaceIds={places.map(p => p.placeId)}
                isInline={true}
              />
            </div>
          )}
        </div>

        <div className={styles.section} style={{ animationDelay: '0.2s' }}>
          <label className={styles.sectionLabel}>🗳️ 투표 후보 ({places.length}개)</label>

          <div className={styles.placeList}>
            {places.length === 0 ? (
              <div className={styles.placeEmpty}>
                <p className={styles.placeEmptyIcon}>🍽️</p>
                <p className={styles.placeEmptyText}>지도에서 장소를 선택하거나 검색해서 추가해주세요</p>
              </div>
            ) : (
              places.map((place, index) => (
                <div
                  key={place.placeId}
                  className={styles.placeCard}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => {
                    if (place.x && place.y) {
                      const kakaoPlace: KakaoPlace = {
                        placeId: place.placeId,
                        name: place.name,
                        address: place.address,
                        category: place.category,
                        categoryDetail: place.categoryDetail,
                        phone: '',
                        x: place.x,
                        y: place.y,
                        parkingInfo: null,
                      };

                      setFocusCoords({ x: place.x, y: place.y });
                      setSelectedPlace(kakaoPlace);
                      setIsBottomSheetOpen(true);
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div className={styles.placeCardContent}>
                    <span className={styles.placeIndex}>{index + 1}</span>
                    <div className={styles.placeInfo}>
                      <p className={styles.placeName}>{place.name}</p>
                      <p className={styles.placeAddress}>{place.address}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePlace(place.placeId);
                    }}
                    className={styles.placeRemove}
                  >
                    <svg className={styles.removeIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.section} style={{ animationDelay: '0.25s' }}>
          <label className={styles.sectionLabel}>⏰ 투표 마감 시간</label>
          <DateTimePicker
            value={deadline}
            onChange={setDeadline}
            placeholder="마감 시간을 선택하세요"
          />
        </div>

        <div className={styles.section} style={{ animationDelay: '0.3s' }}>
          <label className={styles.optionCard}>
            <input
              type="checkbox"
              checked={allowPass}
              onChange={(e) => setAllowPass(e.target.checked)}
              className={styles.optionCheckbox}
            />
            <div>
              <span className={styles.optionTitle}>&quot;상관없음&quot; 옵션 허용</span>
              <p className={styles.optionDesc}>투표자가 패스할 수 있어요</p>
            </div>
          </label>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={classNames(styles.submitBtn, {
            [styles.submitBtnDisabled]: !title || places.length < 2 || !deadline
          })}
        >
          {loading ? (
            <span className={styles.submitLoading}>
              <svg className={styles.submitSpinner} viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              생성 중...
            </span>
          ) : (
            '🚀 투표 만들기'
          )}
        </button>
      </main>

      <PlaceBottomSheet
        place={selectedPlace}
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        onAddPlace={handleAddPlace}
        isAlreadyAdded={selectedPlace ? places.some(p => p.placeId === selectedPlace.placeId) : false}
        regionStatus={selectedRegionStatus}
      />

      {/* Title Input Modal */}
      {mounted && showTitleModal && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>오늘의 투표 제목은? 📝</h2>
            <p className={styles.modalSubtitle}>제목을 정하면 지도에서 맛집을 찾을 수 있어요!</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) setShowTitleModal(false);
              else showToast('제목을 입력해주세요');
            }}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 오늘 점심 회식"
                className={styles.modalInput}
                autoFocus
              />
              <button
                type="submit"
                className={styles.modalButton}
                disabled={!title.trim()}
              >
                입력 완료
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {mounted && toast && toast.show && createPortal(
        <div className={styles.toastContainer}>
          <div className={classNames(styles.toast, {
            [styles.toastSuccess]: toast.type === 'success',
            [styles.toastError]: toast.type === 'error'
          })}>
            <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
            <span className={styles.toastText}>{toast.message}</span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
