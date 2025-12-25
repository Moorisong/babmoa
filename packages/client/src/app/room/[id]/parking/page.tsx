'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import classNames from 'classnames';
import { Header, ParkingForm } from '@/components';
import { ROUTES } from '@/constants';
import { roomsApi, parkingApi } from '@/lib/api';
import type { Room, TimeSlot } from '@/types';
import { getParticipantId, hasRecordedParking, setRecordedParking, getTimeSlotFromDeadline } from '@/lib/utils';
import styles from './page.module.css';

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
            setSelectedTimeSlot(getTimeSlotFromDeadline(result.data.options.deadline));

            if (new Date() < new Date(result.data.options.deadline)) {
                router.replace(ROUTES.ROOM(roomId));
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
        } catch {
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
                <main className={styles.errorMain}>
                    <div className={styles.loadingContainer}>
                        <div className={styles.loadingTitle}></div>
                        <div className={styles.loadingSubtitle}></div>
                    </div>
                </main>
            </>
        );
    }

    if (error || !room) {
        return (
            <>
                <Header />
                <main className={styles.errorMain}>
                    <p className={styles.errorText}>{error || '오류가 발생했습니다'}</p>
                </main>
            </>
        );
    }

    if (alreadyRecorded) {
        return (
            <>
                <Header />
                <main className={styles.successMain}>
                    <div className={styles.successContainer}>
                        <div className={styles.successCircle}>
                            <svg className={styles.successIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className={styles.successTitle}>
                            🎉 주차 경험이 기록되었습니다!
                        </h3>
                        <p className={styles.successText}>소중한 경험을 공유해 주셔서 감사합니다</p>
                        <p className={styles.successHint}>
                            다음에 이 장소를 검색하면 주차 성공률이 표시됩니다
                        </p>
                        <button
                            onClick={() => router.push(ROUTES.ROOM_RESULT(roomId))}
                            className={styles.resultBtn}
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
            <main className={styles.main}>
                {winnerPlace && (
                    <div className={styles.placeInfo}>
                        <p className={styles.placeLabel}>방문한 장소</p>
                        <h1 className={styles.placeName}>{winnerPlace.name}</h1>
                        <p className={styles.placeAddress}>{winnerPlace.address}</p>
                    </div>
                )}

                <div className={styles.timeSlotCard}>
                    <p className={styles.timeSlotLabel}>
                        🕐 언제 방문하셨나요?
                        <span className={styles.timeSlotHint}>(확인해주세요)</span>
                    </p>
                    <div className={styles.timeSlotOptions}>
                        {TIME_SLOT_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setSelectedTimeSlot(option.value)}
                                className={classNames(styles.timeSlotBtn, {
                                    [styles.timeSlotBtnActive]: selectedTimeSlot === option.value,
                                    [styles.timeSlotBtnInactive]: selectedTimeSlot !== option.value,
                                })}
                            >
                                <span className={styles.timeSlotEmoji}>{option.emoji}</span>
                                <span className={styles.timeSlotText}>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.formContainer}>
                    <ParkingForm onSubmit={handleSubmit} loading={submitting} />
                </div>

                <button
                    onClick={() => router.push(ROUTES.ROOM_RESULT(roomId))}
                    className={styles.skipBtn}
                >
                    나중에 할게요
                </button>
            </main>
        </>
    );
}
