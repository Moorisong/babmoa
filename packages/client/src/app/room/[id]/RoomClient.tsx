'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import classNames from 'classnames';
import { Header, VoteCard, LinkShare } from '@/components';
import { ROUTES } from '@/constants';
import { roomsApi } from '@/lib/api';
import type { Room } from '@/types';
import { getParticipantId, hasVoted, setVoted, getTimeRemaining } from '@/lib/utils';
import styles from './RoomClient.module.css';

export default function RoomClient() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.id as string;

    const [room, setRoom] = useState<Room | null>(null);
    const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [voted, setVotedState] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    useEffect(() => {
        if (!room) return;

        const updateTime = () => {
            setTimeRemaining(getTimeRemaining(room.options.deadline));
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, [room]);

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
                router.replace(ROUTES.ROOM_RESULT(roomId));
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
        } catch {
            alert('오류가 발생했습니다');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <>
                <Header />
                <main className={styles.main}>
                    <div className={styles.loadingContainer}>
                        <div className={classNames(styles.shimmer, styles.shimmerTitle)}></div>
                        <div className={classNames(styles.shimmer, styles.shimmerSubtitle)}></div>
                        <div className={classNames(styles.shimmer, styles.shimmerCard)}></div>
                        <div className={classNames(styles.shimmer, styles.shimmerCard)}></div>
                        <div className={classNames(styles.shimmer, styles.shimmerCard)}></div>
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
                    <div className={styles.errorCard}>
                        <p className={styles.errorEmoji}>😢</p>
                        <p className={styles.errorText}>{error || '오류가 발생했습니다'}</p>
                    </div>
                </main>
            </>
        );
    }

    if (voted) {
        return (
            <>
                <Header />
                <main className={styles.main}>
                    <div className={styles.successHero}>
                        <div className={styles.successCircle}>
                            <svg className={styles.successIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className={styles.successTitle}>투표 완료! ✨</h1>
                        <p className={styles.successSubtitle}>마감 후 결과를 확인하세요</p>

                        {timeRemaining === '마감됨' ? (
                            <div className={styles.statusContainer}>
                                <div className={classNames(styles.timeBadge, styles.timeBadgeClosed)}>
                                    ⏰ 투표 마감됨
                                </div>
                                <div className={styles.closedCard}>
                                    <p className={styles.closedText}>🎉 투표가 마감되었습니다!</p>
                                    <button
                                        onClick={() => router.push(ROUTES.ROOM_RESULT(roomId))}
                                        className={styles.resultBtn}
                                    >
                                        결과 보기 →
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={classNames(styles.timeBadge, styles.timeBadgeOpen)}>
                                ⏰ {timeRemaining}
                            </div>
                        )}
                    </div>

                    <div className={styles.section} style={{ animationDelay: '0.1s' }}>
                        <h2 className={styles.sectionTitle}>{room.title}</h2>
                        <div className={styles.placeList}>
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

                    <div style={{ animationDelay: '0.2s' }}>
                        <LinkShare title={room.title} />
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Header />
            <main className={styles.main}>
                <div className={styles.header}>
                    <h1 className={styles.title}>{room.title}</h1>
                    {timeRemaining === '마감됨' ? (
                        <div className={styles.statusContainer}>
                            <div className={classNames(styles.timeBadge, styles.timeBadgeClosed)}>
                                ⏰ 투표 마감됨
                            </div>
                            <div className={styles.closedCard}>
                                <p className={styles.closedText}>🎉 투표가 마감되었습니다!</p>
                                <button
                                    onClick={() => router.push(ROUTES.ROOM_RESULT(roomId))}
                                    className={styles.resultBtn}
                                >
                                    결과 보기 →
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={classNames(styles.timeBadge, styles.timeBadgeOpen)}>
                            ⏰ {timeRemaining}
                        </div>
                    )}
                </div>

                <div className={styles.voteList}>
                    {room.places.map((place, index) => (
                        <VoteCard
                            key={place.placeId}
                            {...place}
                            selected={selectedPlaceId === place.placeId}
                            onSelect={setSelectedPlaceId}
                            index={index}
                        />
                    ))}

                    {room.options.allowPass && (
                        <button
                            onClick={() => setSelectedPlaceId(null)}
                            className={classNames(styles.passOption, {
                                [styles.passOptionSelected]: selectedPlaceId === null
                            })}
                            style={{ animationDelay: `${room.places.length * 0.1}s` }}
                        >
                            <span className={styles.passContent}>
                                <span className={styles.passEmoji}>🤷</span>
                                상관없어요
                            </span>
                        </button>
                    )}
                </div>

                <button
                    onClick={handleVote}
                    disabled={submitting || (selectedPlaceId === undefined)}
                    className={styles.submitBtn}
                    style={{ animationDelay: `${(room.places.length + 1) * 0.1}s` }}
                >
                    {submitting ? (
                        <span className={styles.submitLoading}>
                            <svg className={styles.submitSpinner} viewBox="0 0 24 24" fill="none">
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
