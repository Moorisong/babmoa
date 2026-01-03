'use client';

import Script from 'next/script';
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
    return (
        <>
            <div className={`${styles.adContainer} ${className || ''}`}>
                <ins
                    className="kakao_ad_area"
                    style={{ display: 'none' }}
                    data-ad-unit={unit}
                    data-ad-width={width.toString()}
                    data-ad-height={height.toString()}
                />
            </div>
            <Script
                id="kakao-adfit-init"
                src="//t1.daumcdn.net/kas/static/ba.min.js"
                strategy="afterInteractive"
            />
        </>
    );
}
