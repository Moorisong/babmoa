'use client';

import { useState } from 'react';

interface LinkShareProps {
    url?: string;
    title?: string;
}

export default function LinkShare({ url, title = '회식 투표에 참여해주세요!' }: LinkShareProps) {
    const [copied, setCopied] = useState(false);
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('복사 실패:', error);
        }
    };

    const handleKakaoShare = () => {
        // 카카오톡 공유 (Kakao SDK 필요)
        if (typeof window !== 'undefined' && (window as any).Kakao) {
            const Kakao = (window as any).Kakao;
            if (!Kakao.isInitialized()) {
                const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
                if (kakaoKey) {
                    Kakao.init(kakaoKey);
                }
            }

            Kakao.Share.sendDefault({
                objectType: 'feed',
                content: {
                    title: title,
                    description: '밥모아에서 회식 장소를 함께 정해요!',
                    imageUrl: '', // TODO: 썸네일 이미지
                    link: {
                        webUrl: shareUrl,
                        mobileWebUrl: shareUrl,
                    },
                },
                buttons: [
                    {
                        title: '투표하기',
                        link: {
                            webUrl: shareUrl,
                            mobileWebUrl: shareUrl,
                        },
                    },
                ],
            });
        } else {
            // Kakao SDK 없으면 링크 복사
            handleCopyLink();
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
                onClick={handleKakaoShare}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 rounded-xl transition-colors"
            >
                <span className="text-lg">💬</span>
                <span className="font-medium text-gray-900">카카오톡</span>
            </button>
        </div>
    );
}
