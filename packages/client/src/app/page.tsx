'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Header, LinkShare } from '@/components';
import { roomsApi, placesApi, KakaoPlace } from '@/lib/api';

interface Place {
  placeId: string;
  name: string;
  address: string;
  category: string;
  categoryDetail?: string;
}

const CATEGORIES = ['전체', '한식', '중식', '일식', '양식', '고기', '해산물', '분식', '카페', '술집'];

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [allowPass, setAllowPass] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);

  /* Portal Mounting Logic */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Toast State
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

  const [tooltip, setTooltip] = useState<{ show: boolean; x: number; y: number; text: string } | null>(null);

  const handleTooltipEnter = (e: React.MouseEvent, text: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      show: true,
      x: rect.left + rect.width / 2, // Center horizontally
      y: rect.top - 10, // Above the element
      text
    });
  };

  const handleTooltipLeave = () => {
    setTooltip(null);
  };

  // 장소 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KakaoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 검색 함수
  const performSearch = async (query: string, category: string, page: number = 1, append: boolean = false) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (page === 1) setSearching(true);
    else setLoadingMore(true);

    try {
      const result = await placesApi.search(query, { category, page });
      if (result.success && result.data) {
        const newPlaces = result.data.places;
        if (append) {
          setSearchResults(prev => [...prev, ...newPlaces]);
        } else {
          setSearchResults(newPlaces);
        }
        setShowResults(true);
        setHasMore(!result.data.meta.isEnd && newPlaces.length >= 5);
        setSearchPage(page);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
      setLoadingMore(false);
    }
  };

  // 검색 디바운스
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setSearchPage(1);
      setHasMore(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch(searchQuery, selectedCategory, 1, false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, selectedCategory]);

  // 카테고리 변경 시 재검색
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (searchQuery.trim().length >= 2) {
      performSearch(searchQuery, category, 1, false);
    }
  };

  // 더보기
  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    performSearch(searchQuery, selectedCategory, searchPage + 1, true);
  };

  // 외부 클릭 시 검색 결과 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPlace = (kakaoPlace: KakaoPlace) => {
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
    };

    setPlaces([...places, newPlace]);
    // 검색어는 유지, 드롭다운만 닫기
    setShowResults(false);
  };

  const handleRemovePlace = (placeId: string) => {
    setPlaces(places.filter(p => p.placeId !== placeId));
  };

  const handleSubmit = async () => {
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

    setLoading(true);
    try {
      const result = await roomsApi.create({
        title,
        places,
        options: {
          allowPass,
          deadline: new Date(deadline).toISOString(),
        },
      });

      if (result.success && result.data) {
        setCreatedRoomId(result.data.roomId);
        showToast('투표방이 생성되었습니다!', 'success');
      } else {
        showToast(result.error?.message || '투표방 생성에 실패했습니다');
      }
    } catch (error) {
      showToast('오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 투표방 생성 완료
  if (createdRoomId) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const roomUrl = `${baseUrl}/room/${createdRoomId}`;

    return (
      <>
        <Header />
        <main className="max-w-lg mx-auto px-4 py-8">
          <div className="text-center mb-8 animate-fade-in">
            <div className="success-circle mx-auto mb-4 animate-scale-in">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">투표방 생성 완료! 🎉</h1>
            <p className="text-gray-500">아래 링크를 팀원들에게 공유하세요</p>
          </div>

          <div className="card p-4 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <p className="text-xs font-medium text-indigo-600 mb-2">📎 투표 링크</p>
            <p className="text-sm font-mono text-gray-700 break-all bg-gray-50 p-3 rounded-lg">{roomUrl}</p>
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <LinkShare url={roomUrl} title={title} />
          </div>

          <button
            onClick={() => router.push(`/room/${createdRoomId}`)}
            className="w-full mt-4 py-3 btn-secondary animate-slide-up"
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
      <main className="max-w-lg mx-auto px-5 py-8">
        {/* 히어로 섹션 */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold mb-2">
            <span className="gradient-text">마포구 전용</span>
            <span className="text-gray-900"> 오늘의 회식 PICK</span>
          </h1>
          <p className="text-base text-gray-700 font-medium mb-1">
            실제 방문 기록 기반으로 <span className="text-indigo-600 font-bold">'주차장 정보'</span>까지 확인할 수 있어요.
          </p>
          <p className="text-xs text-gray-500">
            데이터가 쌓인 장소에 한해 제공 (참고용)
          </p>
        </div>

        {/* 제목 입력 */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📝 투표 제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 12월 팀 송년회 장소"
            className="input-field py-3 text-base"
          />
        </div>

        {/* 장소 검색 (Border Added) */}
        <div className="mb-6 animate-slide-up relative z-50 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm" style={{ animationDelay: '0.15s' }} ref={searchRef}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🔎 후보 장소 검색
          </label>

          {/* 마포구 지역 제한 안내 */}
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
            <span className="text-indigo-600">ℹ️</span>
            <span className="text-xs text-indigo-700">마포구 실제 방문 기록을 기반으로 주차 정보를 제공합니다</span>
          </div>

          {/* 지역 고정 표시 */}
          <div className="flex items-center gap-2 mb-3">
            <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 flex items-center gap-1">
              📍 마포구
            </div>
            <span className="text-[10px] text-gray-400">현재 마포구 지역만 지원합니다</span>
          </div>

          {/* 카테고리 필터 (복구) */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedCategory === cat
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 정렬 안내 (고정) */}
          <div className="flex items-center gap-1 mb-4 text-[10px] text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded-lg inline-block">
            <span>✨ 주차 데이터 있는 식당 우선 · 가까운 순</span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults && searchResults.length > 0 && setShowResults(true)}
              placeholder="가게 이름, 지역 이름, 메뉴 등"
              className="input-field py-3 pr-10 text-base"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="animate-spin w-5 h-5 text-indigo-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}

            {/* 검색 결과 드롭다운 */}
            {showResults && searchResults && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-96 overflow-y-auto animate-fade-in">
                {searchResults.map((place) => (
                  <button
                    key={place.placeId}
                    onClick={() => handleSelectPlace(place)}
                    className="w-full p-4 text-left hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">
                        {place.category === '음식점' ? '🍽️' :
                          place.category === '카페' ? '☕' :
                            place.category === '술집' ? '🍺' : '📍'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{place.name}</p>
                        <p className="text-sm text-gray-500 truncate">{place.address}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-indigo-500">{place.category}</span>
                          {place.parkingInfo && (
                            <>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-help ${!place.parkingInfo.hasEnoughData
                                  ? 'bg-gray-50 border-gray-200 text-gray-400'
                                  : place.parkingInfo.successRate !== null && place.parkingInfo.successRate >= 0.7
                                    ? 'bg-green-50 border-green-200 text-green-700'
                                    : place.parkingInfo.successRate !== null && place.parkingInfo.successRate >= 0.4
                                      ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                                      : 'bg-red-50 border-red-200 text-red-700'
                                  }`}
                                onMouseEnter={(e) => {
                                  e.stopPropagation();
                                  const message = place.parkingInfo?.hasEnoughData
                                    ? "주차 성공률은 실제 방문자들이 남긴 기록을 바탕으로 계산된 참고용 수치입니다."
                                    : "아직 주차기록이 충분하지 않아요 ☁️";
                                  handleTooltipEnter(e, message);
                                }}
                                onMouseLeave={(e) => {
                                  e.stopPropagation();
                                  handleTooltipLeave();
                                }}
                              >
                                {place.parkingInfo.hasEnoughData ? (
                                  <>
                                    <span className="font-semibold">🅿️ {Math.round((place.parkingInfo.successRate || 0) * 100)}%</span>
                                    <span className="mx-1 opacity-40">|</span>
                                    <span>{place.parkingInfo.recordCount}건</span>
                                  </>
                                ) : (
                                  <span>🅿️ 데이터 부족</span>
                                )}
                              </span>
                              {place.parkingInfo.hasEnoughData && (
                                <span className="text-[10px] text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded bg-gray-50">
                                  참고용
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                {/* 더보기 버튼 */}
                {hasMore && (
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full py-3 text-center text-indigo-600 font-medium hover:bg-indigo-50 transition-colors border-t border-gray-100"
                  >
                    {loadingMore ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        로딩 중...
                      </span>
                    ) : (
                      '더보기 ↓'
                    )}
                  </button>
                )}
              </div>
            )}

            {/* 검색 결과 없음 */}
            {showResults && searchQuery.length >= 2 && (!searchResults || searchResults.length === 0) && !searching && (
              <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-6 text-center animate-fade-in">
                <p className="text-gray-500">검색 결과가 없습니다</p>
                <p className="text-xs text-gray-400 mt-1">다른 키워드로 검색해보세요</p>
              </div>
            )}
          </div>

          {/* 추가된 장소 목록 */}
          <div className="mt-4 space-y-2">
            {places.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <p className="text-3xl mb-2">🍽️</p>
                <p className="text-xs">장소를 검색해서 추가해주세요</p>
              </div>
            )}
            {places.map((place, index) => (
              <div
                key={place.placeId}
                className="card flex items-center justify-between p-3 animate-scale-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">{place.name}</p>
                    <p className="text-xs text-gray-500 truncate">{place.address}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemovePlace(place.placeId)}
                  className="w-6 h-6 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex items-center justify-center flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 마감 시간 */}
        <div className="mb-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ⏰ 투표 마감 시간
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="input-field py-3 text-sm"
          />
        </div>

        {/* 옵션 */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <label className="card flex items-center gap-4 p-4 cursor-pointer hover:border-indigo-300">
            <input
              type="checkbox"
              checked={allowPass}
              onChange={(e) => setAllowPass(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
            />
            <div>
              <span className="font-medium text-gray-900 text-sm">"상관없음" 옵션 허용</span>
              <p className="text-xs text-gray-500">투표자가 패스할 수 있어요</p>
            </div>
          </label>
        </div>

        {/* 생성 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={loading || !title || places.length === 0 || !deadline}
          className="w-full btn-primary animate-slide-up py-3"
          style={{ animationDelay: '0.3s' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
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

      {/* Tooltip Portal */}
      {mounted && tooltip && tooltip.show && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none animate-fade-in"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-8px'
          }}
        >
          <div className="bg-gray-900 text-white text-xs py-2 px-3 rounded-lg shadow-xl max-w-xs text-center relative">
            {tooltip.text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Portal */}
      {mounted && toast && toast.show && createPortal(
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[10000] animate-slide-up">
          <div className={`px-6 py-3 rounded-full shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'
            }`}>
            <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
