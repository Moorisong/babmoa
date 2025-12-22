'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header, ParkingForm } from '@/components';
import { roomsApi, parkingApi } from '@/lib/api';
import { getParticipantId, hasRecordedParking, setRecordedParking, getTimeSlotFromDeadline } from '@/lib/utils';

interface Room {
    roomId: string;
    title: string;
    options: { allowPass: boolean; deadline: string };
    result: { winnerPlaceId: string | null; decidedAt: string | null };
    places: Array<{ placeId: string; name: string; address: string; category: string }>;
}

type TimeSlot = '평일_점심' | '평일_저녁' | '주말';

const TIME_SLOT_OPTIONS: { value: TimeSlot; label: string; emoji: string }[] = [
    { value: '평일_점심', label: '점심', emoji: '🌤️' },
    { value: '평일_저녁', label: '저녁', emoji: '🌙' },
    { value: '주말', label: '주말', emoji: '🎉' },
];

export default function ParkingPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.id as string;

    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [alreadyRecorded, setAlreadyRecorded] = useState(false);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>('평일_점심');

    useEffect(() => {
        loadRoom();
        setAlreadyRecorded(hasRecordedParking(roomId));
    }, [roomId]);

    const loadRoom = async () => {
        setLoading(true);
        const result = await roomsApi.get(roomId);

        if (result.success && result.data) {
            setRoom(result.data);
            // 투표 마감 시간 기준으로 기본 시간대 설정
            setSelectedTimeSlot(getTimeSlotFromDeadline(result.data.options.deadline));

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
                timeSlot: selectedTimeSlot,
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

    // 방금 기록 완료 또는 이미 기록한 경우
    if (alreadyRecorded) {
        return (
            <>
                <Header />
                <main className="max-w-lg mx-auto px-4 py-8">
                    <div className="text-center py-8 animate-fade-in">
                        <div className="success-circle mx-auto mb-4 animate-scale-in">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            🎉 주차 경험이 기록되었습니다!
                        </h3>
                        <p className="text-gray-500 mb-2">소중한 경험을 공유해 주셔서 감사합니다</p>
                        <p className="text-sm text-indigo-500 mb-6">
                            다음에 이 장소를 검색하면 주차 성공률이 표시됩니다
                        </p>
                        <button
                            onClick={() => router.push(`/room/${roomId}/result`)}
                            className="btn-primary px-8"
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
                    <div className="text-center mb-6">
                        <p className="text-sm text-gray-500 mb-2">방문한 장소</p>
                        <h1 className="text-2xl font-bold text-gray-900">{winnerPlace.name}</h1>
                        <p className="text-sm text-gray-500 mt-1">{winnerPlace.address}</p>
                    </div>
                )}

                {/* 시간대 선택 */}
                <div className="card p-4 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                        🕐 언제 방문하셨나요?
                        <span className="text-xs text-gray-400 ml-2">(확인해주세요)</span>
                    </p>
                    <div className="flex gap-2">
                        {TIME_SLOT_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setSelectedTimeSlot(option.value)}
                                className={`flex-1 py-3 rounded-xl font-medium transition-all ${selectedTimeSlot === option.value
                                        ? 'bg-indigo-500 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <span className="text-lg">{option.emoji}</span>
                                <span className="block text-sm mt-1">{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

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
