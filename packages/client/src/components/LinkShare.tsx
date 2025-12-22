'use client';

import { useState } from 'react';

interface LinkShareProps {
    url?: string;
    title?: string;
}

export default function LinkShare({ url, title = '회식 투표에 참여해주세요!' }: LinkShareProps) {
    const [copied, setCopied] = useState(false);
    const [sharing, setSharing] = useState(false);

    // 배포 환경에서는 NEXT_PUBLIC_BASE_URL 사용
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

    // url prop이 있으면 사용, 없으면 BASE_URL + pathname, 그것도 없으면 현재 URL
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
        } catch (error) {
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

    // 네이티브 공유 (모바일에서 카카오톡 등 모든 앱으로 공유 가능)
    const handleNativeShare = async () => {
        // 중복 클릭 방지
        if (sharing) return;

        if (typeof navigator === 'undefined' || !navigator.share) {
            // 네이티브 공유 미지원 시 링크 복사
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
            // 사용자가 취소한 경우는 무시
            if ((error as Error).name !== 'AbortError') {
                console.error('Share error:', error);
                // 공유 실패 시 링크 복사
                handleCopyLink();
            }
        } finally {
            setSharing(false);
        }
    };

    return (
        <div className="flex gap-3">
            <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
                {copied ? (
                    <>
                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium text-green-600">복사됨!</span>
                    </>
                ) : (
                    <>
                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium text-gray-700">링크 복사</span>
                    </>
                )}
            </button>
            <button
                onClick={handleNativeShare}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="font-medium">공유하기</span>
            </button>
        </div>
    );
}
