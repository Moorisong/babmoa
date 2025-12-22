'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header, ParkingForm } from '@/components';
import { roomsApi, parkingApi } from '@/lib/api';
import { getParticipantId, hasRecordedParking, setRecordedParking, getTimeSlot } from '@/lib/utils';

interface Room {
    roomId: string;
    title: string;
    result: { winnerPlaceId: string | null; decidedAt: string | null };
    places: Array<{ placeId: string; name: string; address: string; category: string }>;
}

export default function ParkingPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.id as string;

    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [alreadyRecorded, setAlreadyRecorded] = useState(false);

    useEffect(() => {
        loadRoom();
        setAlreadyRecorded(hasRecordedParking(roomId));
    }, [roomId]);

    const loadRoom = async () => {
        setLoading(true);
        const result = await roomsApi.get(roomId);

        if (result.success && result.data) {
            setRoom(result.data);

            // 마감 전이면 투표 페이지로
            if (new Date() < new Date(result.data.options.deadline)) {
                router.replace(`/room/${roomId}`);
            }
        } else {
            setError(result.error?.message || '투표방을 찾을 수 없습니다');
        }
        setLoading(false);
    };

    const handleSubmit = async (data: {
        parkingAvailable: boolean;
        parkingExperience: string | null;
    }) => {
        if (!room?.result.winnerPlaceId) return;

        setSubmitting(true);
        try {
            const result = await parkingApi.record({
                roomId,
                placeId: room.result.winnerPlaceId,
                participantId: getParticipantId(),
                parkingAvailable: data.parkingAvailable,
                parkingExperience: data.parkingExperience,
                date: new Date().toISOString(),
                timeSlot: getTimeSlot(),
            });

            if (result.success) {
                setRecordedParking(roomId);
                setAlreadyRecorded(true);
            } else {
                alert(result.error?.message || '기록에 실패했습니다');
            }
        } catch (error) {
            alert('오류가 발생했습니다');
        } finally {
            setSubmitting(false);
        }
    };

    const winnerPlace = room?.places.find(p => p.placeId === room.result.winnerPlaceId);

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

    if (alreadyRecorded) {
        return (
            <>
                <Header />
                <main className="max-w-lg mx-auto px-4 py-8">
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">이미 기록하셨습니다!</h3>
                        <p className="text-gray-500 mb-6">소중한 경험을 공유해 주셔서 감사합니다</p>
                        <button
                            onClick={() => router.push(`/room/${roomId}/result`)}
                            className="px-6 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
                        >
                            결과 페이지로 돌아가기
                        </button>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Header />
            <main className="max-w-lg mx-auto px-4 py-8">
                {/* 장소 정보 */}
                {winnerPlace && (
                    <div className="text-center mb-8">
                        <p className="text-sm text-gray-500 mb-2">방문한 장소</p>
                        <h1 className="text-2xl font-bold text-gray-900">{winnerPlace.name}</h1>
                        <p className="text-sm text-gray-500 mt-1">{winnerPlace.address}</p>
                    </div>
                )}

                {/* 주차 경험 폼 */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <ParkingForm onSubmit={handleSubmit} loading={submitting} />
                </div>

                {/* 돌아가기 */}
                <button
                    onClick={() => router.push(`/room/${roomId}/result`)}
                    className="w-full mt-4 py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                >
                    나중에 할게요
                </button>
            </main>
        </>
    );
}
