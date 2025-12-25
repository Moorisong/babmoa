'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import classNames from 'classnames';
import { Header, VoteCard, LinkShare } from '@/components';
import { ROUTES } from '@/constants';
import { roomsApi } from '@/lib/api';
import type { Room } from '@/types';
import { hasRecordedParking } from '@/lib/utils';
import styles from './page.module.css';

interface VoteResultItem {
    placeId: string | null;
    count: number;
}

export default function ResultPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.id as string;

    const [room, setRoom] = useState<Room | null>(null);
    const [votes, setVotes] = useState<VoteResultItem[]>([]);
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
            router.replace(ROUTES.ROOM(roomId));
            return;
        }

        const resultData = await roomsApi.getResults(roomId);
        if (resultData.success && resultData.data) {
            setVotes(resultData.data.votes);
            setWinnerPlaceId(resultData.data.winnerPlaceId);

            if (resultData.data.winnerPlaceId && !hasRecordedParking(roomId)) {
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
                <main className={styles.main}>
                    <div className={styles.loadingContainer}>
                        <div className={classNames(styles.shimmer, styles.shimmerTitle)}></div>
                        <div className={classNames(styles.shimmer, styles.shimmerWinner)}></div>
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

    return (
        <>
            <Header />
            <main className={styles.main}>
                <div className={styles.resultHeader}>
                    <h1 className={styles.resultTitle}>{room.title}</h1>
                    <div className={styles.totalVotesBadge}>
                        👥 총 {totalVotes}명 투표
                    </div>
                </div>

                {winnerPlace && (
                    <div className={styles.winnerCard}>
                        <div className={styles.winnerEmoji}>🏆</div>
                        <div className={styles.winnerContent}>
                            <div className={styles.winnerHeader}>
                                <span className={styles.winnerHeaderEmoji}>🎉</span>
                                <span className={styles.winnerBadge}>확정 장소</span>
                            </div>
                            <h2 className={styles.winnerName}>{winnerPlace.name}</h2>
                            <p className={styles.winnerAddress}>
                                <svg className={styles.winnerAddressIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                {winnerPlace.address}
                            </p>
                            <div className={styles.winnerVotes}>
                                <span className={styles.winnerVoteCount}>{getVoteCount(winnerPlace.placeId)}</span>
                                <span className={styles.winnerVoteLabel}>표</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles.resultsSection}>
                    <h3 className={styles.resultsTitle}>📊 전체 결과</h3>
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

                    {votes.some(v => v.placeId === null) && (
                        <div className={styles.passCard} style={{ animationDelay: `${room.places.length * 0.1}s` }}>
                            <div className={styles.passContent}>
                                <span className={styles.passLabel}>
                                    <span className={styles.passEmoji}>🤷</span>
                                    상관없어요
                                </span>
                                <span className={styles.passVotes}>
                                    {votes.find(v => v.placeId === null)?.count || 0}표
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ animationDelay: '0.3s' }}>
                    <LinkShare title={room.title} />
                </div>

                {showParkingPrompt && (
                    <div className={styles.parkingPrompt}>
                        <p className={styles.parkingPromptContent}>
                            <span className={styles.parkingPromptEmoji}>🚗</span>
                            방문하셨나요? 주차 경험을 공유해주세요!
                        </p>
                        <Link
                            href={ROUTES.ROOM_PARKING(roomId)}
                            className={styles.parkingPromptBtn}
                        >
                            주차 경험 기록하기 →
                        </Link>
                    </div>
                )}
            </main>
        </>
    );
}
