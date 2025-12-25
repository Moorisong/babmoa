'use client';

import { useState } from 'react';
import styles from './LinkShare.module.css';

interface LinkShareProps {
    url?: string;
    title?: string;
}

export default function LinkShare({ url, title = '회식 투표에 참여해주세요!' }: LinkShareProps) {
    const [copied, setCopied] = useState(false);
    const [sharing, setSharing] = useState(false);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

    const shareUrl = url
        ? url
        : baseUrl
            ? `${baseUrl}${pathname}`
            : (typeof window !== 'undefined' ? window.location.href : '');

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleNativeShare = async () => {
        if (sharing) return;

        if (typeof navigator === 'undefined' || !navigator.share) {
            handleCopyLink();
            return;
        }

        try {
            setSharing(true);
            await navigator.share({
                title: `📍 ${title}`,
                text: '어디서 먹을지 같이 정해요! 투표 마감 전에 참여해주세요 ⏰',
                url: shareUrl,
            });
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                console.error('Share error:', error);
                handleCopyLink();
            }
        } finally {
            setSharing(false);
        }
    };

    return (
        <div className={styles.container}>
            <button onClick={handleCopyLink} className={styles.secondary}>
                {copied ? (
                    <>
                        <svg className={styles.iconSuccess} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className={styles.textSuccess}>복사됨!</span>
                    </>
                ) : (
                    <>
                        <svg className={styles.iconGray} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span className={styles.textGray}>링크 복사</span>
                    </>
                )}
            </button>
            <button onClick={handleNativeShare} className={styles.primary}>
                <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className={styles.textWhite}>공유하기</span>
            </button>
        </div>
    );
}
