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

        // 투표방 정보 로드
        const roomResult = await roomsApi.get(roomId);
        if (!roomResult.success || !roomResult.data) {
            setError(roomResult.error?.message || '투표방을 찾을 수 없습니다');
            setLoading(false);
            return;
        }
        setRoom(roomResult.data);

        // 마감 전이면 투표 페이지로
        if (new Date() < new Date(roomResult.data.options.deadline)) {
            router.replace(`/room/${roomId}`);
            return;
        }

        // 결과 로드
        const resultData = await roomsApi.getResults(roomId);
        if (resultData.success && resultData.data) {
            setVotes(resultData.data.votes);
            setWinnerPlaceId(resultData.data.winnerPlaceId);

            // 주차 기록 안 했으면 프롬프트 표시
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

    return (
        <>
            <Header />
            <main className="max-w-lg mx-auto px-4 py-8">
                {/* 결과 헤더 */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{room.title}</h1>
                    <p className="text-gray-500">총 {totalVotes}명 투표</p>
                </div>

                {/* 우승 장소 */}
                {winnerPlace && (
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl p-6 mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">🏆</span>
                            <span className="text-sm font-medium opacity-80">확정 장소</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-1">{winnerPlace.name}</h2>
                        <p className="text-sm opacity-80">{winnerPlace.address}</p>
                        <p className="mt-3 text-lg font-bold">{getVoteCount(winnerPlace.placeId)}표</p>
                    </div>
                )}

                {/* 모든 투표 결과 */}
                <div className="space-y-3 mb-8">
                    {room.places.map((place) => (
                        <VoteCard
                            key={place.placeId}
                            {...place}
                            selected={place.placeId === winnerPlaceId}
                            onSelect={() => { }}
                            voteCount={getVoteCount(place.placeId)}
                            showCount
                            disabled
                        />
                    ))}

                    {/* 상관없음 투표 */}
                    {votes.some(v => v.placeId === null) && (
                        <div className="p-4 rounded-xl bg-gray-50 border-2 border-gray-200">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-600">🤷 상관없어요</span>
                                <span className="text-sm font-medium text-gray-700">
                                    {votes.find(v => v.placeId === null)?.count || 0}표
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 공유 */}
                <LinkShare title={room.title} />

                {/* 주차 경험 기록 유도 */}
                {showParkingPrompt && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <p className="text-blue-800 font-medium mb-3">
                            🚗 방문하셨나요? 주차 경험을 공유해주세요!
                        </p>
                        <Link
                            href={`/room/${roomId}/parking`}
                            className="block w-full py-3 text-center bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
                        >
                            주차 경험 기록하기
                        </Link>
                    </div>
                )}
            </main>
        </>
    );
}
