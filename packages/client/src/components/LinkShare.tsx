'use client';

import { useState, useEffect } from 'react';

interface LinkShareProps {
    url?: string;
    title?: string;
}

export default function LinkShare({ url, title = '회식 투표에 참여해주세요!' }: LinkShareProps) {
    const [copied, setCopied] = useState(false);
    const [kakaoReady, setKakaoReady] = useState(false);

    // 배포 환경에서는 NEXT_PUBLIC_BASE_URL 사용
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

    // url prop이 있으면 사용, 없으면 BASE_URL + pathname, 그것도 없으면 현재 URL
    const shareUrl = url
        ? url
        : baseUrl
            ? `${baseUrl}${pathname}`
            : (typeof window !== 'undefined' ? window.location.href : '');

    useEffect(() => {
        const initKakao = () => {
            if (typeof window !== 'undefined' && (window as any).Kakao) {
                const Kakao = (window as any).Kakao;
                if (!Kakao.isInitialized()) {
                    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
                    if (kakaoKey) {
                        try {
                            Kakao.init(kakaoKey);
                            console.log('Kakao SDK initialized');
                            setKakaoReady(true);
                        } catch (e) {
                            console.error('Kakao init error:', e);
                        }
                    }
                } else {
                    setKakaoReady(true);
                }
            }
        };

        const timer = setTimeout(initKakao, 500);
        return () => clearTimeout(timer);
    }, []);

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

    const handleKakaoShare = () => {
        if (typeof window === 'undefined') return;

        const Kakao = (window as any).Kakao;

        if (!Kakao) {
            alert('카카오 SDK를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        if (!Kakao.isInitialized()) {
            const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
            if (kakaoKey) {
                try {
                    Kakao.init(kakaoKey);
                } catch (e) {
                    handleCopyLink();
                    return;
                }
            } else {
                handleCopyLink();
                return;
            }
        }

        try {
            Kakao.Share.sendDefault({
                objectType: 'text',
                text: `📍 ${title}\n\n어디서 먹을지 같이 정해요! 투표 마감 전에 참여해주세요 ⏰`,
                link: {
                    webUrl: shareUrl,
                    mobileWebUrl: shareUrl,
                },
            });
        } catch (error) {
            console.error('Kakao share error:', error);
            alert('카카오톡 공유에 실패했습니다. 링크가 복사되었습니다.');
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
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.89 1.89 5.41 4.68 6.83l-1.01 3.68c-.08.29.21.54.48.39L10.34 19c.54.07 1.1.1 1.66.1 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                </svg>
                <span className="font-medium text-gray-900">카카오톡</span>
            </button>
        </div>
    );
}
