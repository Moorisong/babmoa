'use client';

import { useEffect, useRef } from 'react';
import styles from './KakaoAdFit.module.css';

interface KakaoAdFitProps {
    unit: string;
    width: number;
    height: number;
    className?: string;
}

export default function KakaoAdFit({
    unit = 'DAN-autWIUxSZYqBcG6n',
    width = 320,
    height = 50,
    className
}: KakaoAdFitProps) {
    const adRef = useRef<HTMLDivElement>(null);
    const isAdLoaded = useRef(false);

    useEffect(() => {
        // 이미 광고가 로드되었으면 중복 실행 방지
        if (isAdLoaded.current) return;

        const script = document.createElement('script');
        script.src = '//t1.daumcdn.net/kas/static/ba.min.js';
        script.async = true;

        script.onload = () => {
            isAdLoaded.current = true;
        };

        if (adRef.current) {
            adRef.current.appendChild(script);
        }

        return () => {
            // Cleanup: 컴포넌트 언마운트 시 스크립트 제거
            if (adRef.current && script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, []);

    return (
        <div ref={adRef} className={`${styles.adContainer} ${className || ''}`}>
            <ins
                className="kakao_ad_area"
                style={{ display: 'none' }}
                data-ad-unit={unit}
                data-ad-width={width.toString()}
                data-ad-height={height.toString()}
            />
        </div>
    );
}
