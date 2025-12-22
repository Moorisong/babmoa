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

  // 임시 장소 추가 (실제로는 카카오맵 검색 연동)
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddPlace = () => {
    if (!searchQuery.trim()) return;

    // TODO: 카카오맵 API 연동
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
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">투표방 생성 완료!</h1>
            <p className="text-gray-500">아래 링크를 팀원들에게 공유하세요</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">투표 링크</p>
            <p className="text-sm font-mono text-gray-700 break-all">{roomUrl}</p>
          </div>

          <LinkShare url={roomUrl} title={title} />

          <button
            onClick={() => router.push(`/room/${createdRoomId}`)}
            className="w-full mt-4 py-3 text-blue-600 font-medium hover:bg-blue-50 rounded-xl transition-colors"
          >
            투표방으로 이동
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">회식 투표 만들기</h1>
        <p className="text-gray-500 mb-8">빠르게 회식 장소를 정해보세요</p>

        {/* 제목 입력 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            투표 제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 12월 송년회 장소"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 장소 추가 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            후보 장소
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="장소 이름 검색"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlace()}
            />
            <button
              onClick={handleAddPlace}
              className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              추가
            </button>
          </div>

          {/* 추가된 장소 목록 */}
          <div className="space-y-2">
            {places.map((place) => (
              <div
                key={place.placeId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-gray-900">{place.name}</p>
                  <p className="text-sm text-gray-500">{place.address}</p>
                </div>
                <button
                  onClick={() => handleRemovePlace(place.placeId)}
                  className="text-gray-400 hover:text-red-500"
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
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            투표 마감 시간
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 옵션 */}
        <div className="mb-8">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowPass}
              onChange={(e) => setAllowPass(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-gray-700">"상관없음" 옵션 허용</span>
          </label>
        </div>

        {/* 생성 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={loading || !title || places.length === 0 || !deadline}
          className="w-full py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '생성 중...' : '투표 만들기'}
        </button>
      </main>
    </>
  );
}
