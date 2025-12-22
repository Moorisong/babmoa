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
    categoryDetail?: string;
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
                <main className="max-w-lg mx-auto px-4 py-8">
                    <div className="space-y-4">
                        <div className="h-8 shimmer rounded-lg w-3/4"></div>
                        <div className="h-4 shimmer rounded-lg w-1/2"></div>
                        <div className="card p-6 shimmer h-24"></div>
                        <div className="card p-6 shimmer h-24"></div>
                        <div className="card p-6 shimmer h-24"></div>
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
                    <div className="card p-8 animate-fade-in">
                        <p className="text-4xl mb-4">😢</p>
                        <p className="text-red-500 font-medium">{error || '오류가 발생했습니다'}</p>
                    </div>
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
                    <div className="text-center mb-8 animate-fade-in">
                        <div className="success-circle mx-auto mb-4 animate-scale-in">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">투표 완료! ✨</h1>
                        <p className="text-gray-500">마감 후 결과를 확인하세요</p>
                        <div className="inline-block mt-3 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium">
                            ⏰ {getTimeRemaining(room.options.deadline)}
                        </div>
                    </div>

                    <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <h2 className="text-lg font-bold text-gray-900 mb-4">{room.title}</h2>
                        <div className="space-y-3">
                            {room.places.map((place, index) => (
                                <VoteCard
                                    key={place.placeId}
                                    {...place}
                                    selected={false}
                                    onSelect={() => { }}
                                    disabled
                                    index={index}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <LinkShare title={room.title} />
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Header />
            <main className="max-w-lg mx-auto px-4 py-8">
                <div className="mb-8 animate-fade-in">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{room.title}</h1>
                    <div className="inline-block px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium">
                        ⏰ {getTimeRemaining(room.options.deadline)}
                    </div>
                </div>

                {/* 투표 선택 */}
                <div className="space-y-3 mb-6">
                    {room.places.map((place, index) => (
                        <VoteCard
                            key={place.placeId}
                            {...place}
                            selected={selectedPlaceId === place.placeId}
                            onSelect={setSelectedPlaceId}
                            index={index}
                        />
                    ))}

                    {/* 상관없음 옵션 */}
                    {room.options.allowPass && (
                        <button
                            onClick={() => setSelectedPlaceId(null)}
                            className={`card w-full p-4 text-left transition-all animate-slide-up ${selectedPlaceId === null
                                ? 'card-selected !border-gray-500 !bg-gray-50'
                                : ''
                                }`}
                            style={{ animationDelay: `${room.places.length * 0.1}s` }}
                        >
                            <span className="font-medium text-gray-600 flex items-center gap-2">
                                <span className="text-xl">🤷</span>
                                상관없어요
                            </span>
                        </button>
                    )}
                </div>

                {/* 투표 버튼 */}
                <button
                    onClick={handleVote}
                    disabled={submitting || (selectedPlaceId === undefined)}
                    className="w-full btn-primary animate-slide-up"
                    style={{ animationDelay: `${(room.places.length + 1) * 0.1}s` }}
                >
                    {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            투표 중...
                        </span>
                    ) : (
                        '✋ 투표하기'
                    )}
                </button>
            </main>
        </>
    );
}
