'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Header, LinkShare, DateTimePicker, PlaceBottomSheet, SearchModal } from '@/components';
import { roomsApi, KakaoPlace } from '@/lib/api';

// KakaoMap은 SSR 비활성화 (window.kakao 필요)
const KakaoMap = dynamic(() => import('@/components/KakaoMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-100 rounded-2xl flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <svg className="animate-spin w-8 h-8 text-indigo-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm text-gray-500">지도 로딩 중...</span>
      </div>
    </div>
  )
});

interface Place {
  placeId: string;
  name: string;
  address: string;
  category: string;
  categoryDetail?: string;
  x?: string;
  y?: string;
}

type District = '강남구' | '관악구' | '영등포구';

const DISTRICTS: District[] = ['강남구', '관악구', '영등포구'];

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [allowPass, setAllowPass] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);

  // 지도 관련 상태
  const [selectedDistrict, setSelectedDistrict] = useState<District>('강남구');
  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [focusCoords, setFocusCoords] = useState<{ x: string; y: string } | null>(null);

  // Portal Mounting
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

  // 마커 클릭 핸들러
  const handleMarkerClick = useCallback((place: KakaoPlace) => {
    setSelectedPlace(place);
    setIsBottomSheetOpen(true);
  }, []);

  // 장소 추가 핸들러
  const handleAddPlace = (kakaoPlace: KakaoPlace) => {
    if (places.some(p => p.placeId === kakaoPlace.placeId)) {
      showToast('이미 추가된 장소입니다');
      return;
    }

    // 지원 지역 확인 (주소에 3개구 포함 여부)
    const supportedDistricts = ['관악구', '영등포구', '강남구'];
    const isSupported = supportedDistricts.some(district =>
      kakaoPlace.address.includes(district)
    );

    if (!isSupported) {
      showToast('현재 관악구, 영등포구, 강남구만 지원합니다');
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

  // 장소 삭제 핸들러
  const handleRemovePlace = (placeId: string) => {
    setPlaces(places.filter(p => p.placeId !== placeId));
  };

  // 검색에서 장소 선택
  const handleSearchSelect = (kakaoPlace: KakaoPlace) => {
    handleAddPlace(kakaoPlace);
    setIsSearchExpanded(false);
  };

  // 투표방 생성
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
      <main className="max-w-lg mx-auto px-5 py-6">
        {/* 히어로 섹션 */}
        <div className="text-center mb-6 animate-fade-in">
          <h1 className="text-2xl font-bold mb-2">
            <span className="gradient-text">서울 3개구</span>
            <span className="text-gray-900"> 오늘의 회식 PICK</span>
          </h1>
          <p className="text-sm text-gray-600">
            지도에서 식당을 찾고, <span className="text-indigo-600 font-semibold">주차 정보</span>까지 확인하세요
          </p>
        </div>

        {/* 제목 입력 */}
        <div className="mb-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
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

        {/* 지역 필터 + 지도 */}
        <div className="mb-5 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🗺️ 지도에서 후보 선택
          </label>

          {/* 지역 필터 */}
          <div className="flex gap-2 mb-3">
            {DISTRICTS.map((district) => (
              <button
                key={district}
                onClick={() => setSelectedDistrict(district)}
                className={`district-chip ${selectedDistrict === district ? 'active' : ''}`}
              >
                📍 {district}
              </button>
            ))}
          </div>

          {/* 지도 */}
          <div className="map-container relative">
            <KakaoMap
              district={selectedDistrict}
              onMarkerClick={handleMarkerClick}
              focusCoords={focusCoords}
            />

            {/* 지도 하단 안내 */}
            <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600 flex items-center gap-2">
              <span className="text-red-500">📍</span>
              <span><b>빨간 마커</b>를 클릭하면 상세 정보를 확인할 수 있어요</span>
            </div>
          </div>

          {/* 검색으로 추가 토글 */}
          <button
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            className={`w-full mt-5 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${isSearchExpanded
              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200'
              : 'bg-white border-2 border-dashed border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
              }`}
          >
            <span className="text-lg">{isSearchExpanded ? '✕' : '🔍'}</span>
            <span>{isSearchExpanded ? '검색 닫기' : '검색으로 추가'}</span>
          </button>

          {/* 인라인 검색 UI */}
          {isSearchExpanded && (
            <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-slide-up">
              <SearchModal
                isOpen={true}
                onClose={() => setIsSearchExpanded(false)}
                onSelectPlace={handleSearchSelect}
                addedPlaceIds={places.map(p => p.placeId)}
                selectedDistrict={selectedDistrict}
                isInline={true}
              />
            </div>
          )}
        </div>

        {/* 선택된 후보 목록 */}
        <div className="mb-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🗳️ 투표 후보 ({places.length}개)
          </label>

          <div className="space-y-2">
            {places.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl text-gray-400">
                <p className="text-3xl mb-2">🍽️</p>
                <p className="text-xs">지도에서 장소를 선택하거나 검색해서 추가해주세요</p>
              </div>
            ) : (
              places.map((place, index) => (
                <div
                  key={place.placeId}
                  className="card flex items-center justify-between p-3 animate-scale-in cursor-pointer hover:border-indigo-400"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => {
                    if (place.x && place.y) {
                      setFocusCoords({ x: place.x, y: place.y });
                      // 해당 장소 정보창 열기
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
                      setSelectedPlace(kakaoPlace);
                      setIsBottomSheetOpen(true);
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePlace(place.placeId);
                    }}
                    className="w-6 h-6 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex items-center justify-center flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 마감 시간 */}
        <div className="mb-5 animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ⏰ 투표 마감 시간
          </label>
          <DateTimePicker
            value={deadline}
            onChange={setDeadline}
            placeholder="마감 시간을 선택하세요"
          />
        </div>

        {/* 옵션 */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
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
        {(() => {
          const isDisabled = !title || places.length < 2 || !deadline;

          return (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full btn-primary py-3 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          );
        })()}
      </main>

      {/* Bottom Sheet */}
      <PlaceBottomSheet
        place={selectedPlace}
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        onAddPlace={handleAddPlace}
        isAlreadyAdded={selectedPlace ? places.some(p => p.placeId === selectedPlace.placeId) : false}
      />


      {/* Toast Portal */}
      {mounted && toast && toast.show && createPortal(
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[10000] animate-slide-up">
          <div className={`px-6 py-3 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap max-w-[90vw] ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'
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
