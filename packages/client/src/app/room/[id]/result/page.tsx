'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, VoteCard, LinkShare } from '@/components';
import { roomsApi } from '@/lib/api';
import { hasRecordedParking } from '@/lib/utils';

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

interface VoteResult {
    placeId: string | null;
    count: number;
}

export default function ResultPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.id as string;

    const [room, setRoom] = useState<Room | null>(null);
    const [votes, setVotes] = useState<VoteResult[]>([]);
    const [winnerPlaceId, setWinnerPlaceId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showParkingPrompt, setShowParkingPrompt] = useState(false);

    useEffect(() => {
        loadResults();
    }, [roomId]);

    const loadResults = async () => {
        setLoading(true);

        const roomResult = await roomsApi.get(roomId);
        if (!roomResult.success || !roomResult.data) {
            setError(roomResult.error?.message || '투표방을 찾을 수 없습니다');
            setLoading(false);
            return;
        }
        setRoom(roomResult.data);

        if (new Date() < new Date(roomResult.data.options.deadline)) {
            router.replace(`/room/${roomId}`);
            return;
        }

        const resultData = await roomsApi.getResults(roomId);
        if (resultData.success && resultData.data) {
            setVotes(resultData.data.votes);
            setWinnerPlaceId(resultData.data.winnerPlaceId);

            if (!hasRecordedParking(roomId)) {
                setTimeout(() => setShowParkingPrompt(true), 2000);
            }
        }

        setLoading(false);
    };

    const getVoteCount = (placeId: string): number => {
        const vote = votes.find(v => v.placeId === placeId);
        return vote?.count || 0;
    };

    const totalVotes = votes.reduce((sum, v) => sum + v.count, 0);
    const winnerPlace = room?.places.find(p => p.placeId === winnerPlaceId);

    if (loading) {
        return (
            <>
                <Header />
                <main className="max-w-lg mx-auto px-4 py-8">
                    <div className="space-y-4">
                        <div className="h-8 shimmer rounded-lg w-3/4 mx-auto"></div>
                        <div className="h-32 shimmer rounded-2xl"></div>
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

    return (
        <>
            <Header />
            <main className="max-w-lg mx-auto px-4 py-8">
                {/* 결과 헤더 */}
                <div className="text-center mb-8 animate-fade-in">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{room.title}</h1>
                    <div className="inline-block px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                        👥 총 {totalVotes}명 투표
                    </div>
                </div>

                {/* 우승 장소 */}
                {winnerPlace && (
                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white rounded-3xl p-6 mb-8 animate-scale-in shadow-xl">
                        <div className="absolute top-0 right-0 text-8xl opacity-20 -mt-4 -mr-4">🏆</div>
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">🎉</span>
                                <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                                    확정 장소
                                </span>
                            </div>
                            <h2 className="text-3xl font-bold mb-2">{winnerPlace.name}</h2>
                            <p className="text-white/80 flex items-center gap-1 text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                {winnerPlace.address}
                            </p>
                            <div className="mt-4 flex items-center gap-2">
                                <span className="text-3xl font-bold">{getVoteCount(winnerPlace.placeId)}</span>
                                <span className="text-white/80">표</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 모든 투표 결과 */}
                <div className="space-y-3 mb-8">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                        📊 전체 결과
                    </h3>
                    {room.places.map((place, index) => (
                        <VoteCard
                            key={place.placeId}
                            {...place}
                            selected={place.placeId === winnerPlaceId}
                            onSelect={() => { }}
                            voteCount={getVoteCount(place.placeId)}
                            showCount
                            disabled
                            index={index}
                        />
                    ))}

                    {/* 상관없음 투표 */}
                    {votes.some(v => v.placeId === null) && (
                        <div className="card p-4 animate-slide-up" style={{ animationDelay: `${room.places.length * 0.1}s` }}>
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-600 flex items-center gap-2">
                                    <span className="text-xl">🤷</span>
                                    상관없어요
                                </span>
                                <span className="text-sm font-bold text-indigo-600">
                                    {votes.find(v => v.placeId === null)?.count || 0}표
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 공유 */}
                <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
                    <LinkShare title={room.title} />
                </div>

                {/* 주차 경험 기록 유도 */}
                {showParkingPrompt && (
                    <div className="mt-6 card p-5 border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 animate-slide-up">
                        <p className="text-gray-800 font-medium mb-4 flex items-center gap-2">
                            <span className="text-xl">🚗</span>
                            방문하셨나요? 주차 경험을 공유해주세요!
                        </p>
                        <Link
                            href={`/room/${roomId}/parking`}
                            className="block w-full py-3 text-center btn-primary"
                        >
                            주차 경험 기록하기 →
                        </Link>
                    </div>
                )}
            </main>
        </>
    );
}
