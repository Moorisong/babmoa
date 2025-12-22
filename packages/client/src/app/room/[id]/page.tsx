'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header, VoteCard, LinkShare } from '@/components';
import { roomsApi } from '@/lib/api';
import { getParticipantId, hasVoted, setVoted, getTimeRemaining } from '@/lib/utils';

interface Place {
    placeId: string;
    name: string;
    address: string;
    category: string;
}

interface Room {
    roomId: string;
    title: string;
    places: Place[];
    options: { allowPass: boolean; deadline: string };
    result: { winnerPlaceId: string | null; decidedAt: string | null };
}

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.id as string;

    const [room, setRoom] = useState<Room | null>(null);
    const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [voted, setVotedState] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadRoom();
        setVotedState(hasVoted(roomId));
    }, [roomId]);

    const loadRoom = async () => {
        setLoading(true);
        const result = await roomsApi.get(roomId);

        if (result.success && result.data) {
            setRoom(result.data);

            // isClosed 또는 마감 시간 확인하여 결과 페이지로
            if (result.data.isClosed) {
                router.replace(`/room/${roomId}/result`);
            }
        } else {
            setError(result.error?.message || '투표방을 찾을 수 없습니다');
        }
        setLoading(false);
    };

    const handleVote = async () => {
        if (voted) return;

        setSubmitting(true);
        try {
            const participantId = getParticipantId();
            const result = await roomsApi.vote(roomId, {
                placeId: selectedPlaceId,
                participantId,
            });

            if (result.success) {
                setVoted(roomId);
                setVotedState(true);
            } else {
                alert(result.error?.message || '투표에 실패했습니다');
            }
        } catch (error) {
            alert('오류가 발생했습니다');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <>
                <Header />
                <main className="max-w-lg mx-auto px-4 py-8 text-center">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded mb-4 w-3/4 mx-auto"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                    </div>
                </main>
            </>
        );
    }

    if (error || !room) {
        return (
            <>
                <Header />
                <main className="max-w-lg mx-auto px-4 py-8 text-center">
                    <p className="text-red-500">{error || '오류가 발생했습니다'}</p>
                </main>
            </>
        );
    }

    // 투표 완료 상태
    if (voted) {
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
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">투표 완료!</h1>
                        <p className="text-gray-500">마감 후 결과를 확인하세요</p>
                        <p className="text-sm text-blue-500 mt-2">{getTimeRemaining(room.options.deadline)}</p>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">{room.title}</h2>
                        <div className="space-y-3">
                            {room.places.map((place) => (
                                <VoteCard
                                    key={place.placeId}
                                    {...place}
                                    selected={false}
                                    onSelect={() => { }}
                                    disabled
                                />
                            ))}
                        </div>
                    </div>

                    <LinkShare title={room.title} />
                </main>
            </>
        );
    }

    return (
        <>
            <Header />
            <main className="max-w-lg mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{room.title}</h1>
                    <p className="text-sm text-blue-500">{getTimeRemaining(room.options.deadline)}</p>
                </div>

                {/* 투표 선택 */}
                <div className="space-y-3 mb-6">
                    {room.places.map((place) => (
                        <VoteCard
                            key={place.placeId}
                            {...place}
                            selected={selectedPlaceId === place.placeId}
                            onSelect={setSelectedPlaceId}
                        />
                    ))}

                    {/* 상관없음 옵션 */}
                    {room.options.allowPass && (
                        <button
                            onClick={() => setSelectedPlaceId(null)}
                            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedPlaceId === null
                                ? 'border-gray-500 bg-gray-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <span className="font-medium text-gray-600">🤷 상관없어요</span>
                        </button>
                    )}
                </div>

                {/* 투표 버튼 */}
                <button
                    onClick={handleVote}
                    disabled={submitting || (selectedPlaceId === undefined)}
                    className="w-full py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? '투표 중...' : '투표하기'}
                </button>
            </main>
        </>
    );
}
