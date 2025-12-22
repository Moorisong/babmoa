'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header, LinkShare } from '@/components';
import { roomsApi } from '@/lib/api';

interface Place {
  placeId: string;
  name: string;
  address: string;
  category: string;
}

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [allowPass, setAllowPass] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddPlace = () => {
    if (!searchQuery.trim()) return;

    const newPlace: Place = {
      placeId: `temp_${Date.now()}`,
      name: searchQuery,
      address: '검색 결과 주소',
      category: '음식점',
    };

    setPlaces([...places, newPlace]);
    setSearchQuery('');
  };

  const handleRemovePlace = (placeId: string) => {
    setPlaces(places.filter(p => p.placeId !== placeId));
  };

  const handleSubmit = async () => {
    if (!title || places.length === 0 || !deadline) {
      alert('제목, 장소, 마감 시간을 모두 입력해주세요');
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
      } else {
        alert(result.error?.message || '투표방 생성에 실패했습니다');
      }
    } catch (error) {
      alert('오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 투표방 생성 완료
  if (createdRoomId) {
    const roomUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/room/${createdRoomId}`;

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
      <main className="max-w-lg mx-auto px-4 py-8">
        {/* 히어로 섹션 */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-3xl font-bold mb-3">
            <span className="gradient-text">회식 장소</span>
            <span className="text-gray-900">, 투표로 정하자!</span>
          </h1>
          <p className="text-gray-500">
            링크 하나로 팀원들과 빠르게 장소를 결정해보세요
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
            className="input-field"
          />
        </div>

        {/* 장소 추가 */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📍 후보 장소
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="장소 이름 입력"
              className="input-field flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlace()}
            />
            <button
              onClick={handleAddPlace}
              className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:opacity-90 transition-opacity font-medium shadow-lg shadow-indigo-200"
            >
              추가
            </button>
          </div>

          {/* 추가된 장소 목록 */}
          <div className="space-y-2">
            {places.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-2">🍽️</p>
                <p className="text-sm">장소를 추가해주세요</p>
              </div>
            )}
            {places.map((place, index) => (
              <div
                key={place.placeId}
                className="card flex items-center justify-between p-4 animate-scale-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{place.name}</p>
                    <p className="text-xs text-gray-500">{place.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemovePlace(place.placeId)}
                  className="w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 마감 시간 */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ⏰ 투표 마감 시간
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="input-field"
          />
        </div>

        {/* 옵션 */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <label className="card flex items-center gap-4 p-4 cursor-pointer hover:border-indigo-300">
            <input
              type="checkbox"
              checked={allowPass}
              onChange={(e) => setAllowPass(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
            />
            <div>
              <span className="font-medium text-gray-900">"상관없음" 옵션 허용</span>
              <p className="text-xs text-gray-500">투표자가 패스할 수 있어요</p>
            </div>
          </label>
        </div>

        {/* 생성 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={loading || !title || places.length === 0 || !deadline}
          className="w-full btn-primary animate-slide-up"
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
    </>
  );
}
