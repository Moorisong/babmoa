'use client';

import { useState } from 'react';
import classNames from 'classnames';
import styles from './ParkingForm.module.css';

type ParkingStep = 'available' | 'experience';

interface ParkingFormProps {
    onSubmit: (data: {
        parkingAvailable: boolean;
        parkingExperience: string | null;
    }) => void;
    loading?: boolean;
}

export default function ParkingForm({ onSubmit, loading = false }: ParkingFormProps) {
    const [step, setStep] = useState<ParkingStep>('available');
    const [, setParkingAvailable] = useState<boolean | null>(null);

    const handleAvailableSelect = (available: boolean | null) => {
        setParkingAvailable(available);

        if (available === false) {
            onSubmit({ parkingAvailable: false, parkingExperience: null });
        } else if (available === null) {
            onSubmit({ parkingAvailable: false, parkingExperience: null });
        } else {
            setStep('experience');
        }
    };

    const handleExperienceSelect = (experience: string) => {
        onSubmit({ parkingAvailable: true, parkingExperience: experience });
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinnerWrapper}>
                    <div className={styles.spinner}></div>
                    <div className={styles.spinnerActive}></div>
                </div>
                <p className={styles.loadingText}>기록 중...</p>
                <p className={styles.loadingSubtext}>잠시만 기다려주세요</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {step === 'available' && (
                <>
                    <h3 className={styles.title}>주차장이 있었나요?</h3>
                    <div className={styles.optionsGrid}>
                        <button
                            onClick={() => handleAvailableSelect(true)}
                            disabled={loading}
                            className={classNames(styles.optionBtn, styles.optionBtnBlue)}
                        >
                            <span className={styles.emoji}>🅿️</span>
                            <span className={styles.label}>있었어요</span>
                        </button>
                        <button
                            onClick={() => handleAvailableSelect(false)}
                            disabled={loading}
                            className={classNames(styles.optionBtn, styles.optionBtnOrange)}
                        >
                            <span className={styles.emoji}>❌</span>
                            <span className={styles.label}>없었어요</span>
                        </button>
                        <button
                            onClick={() => handleAvailableSelect(null)}
                            disabled={loading}
                            className={styles.optionBtn}
                        >
                            <span className={styles.emoji}>🤔</span>
                            <span className={styles.labelMuted}>잘 모르겠어요</span>
                        </button>
                    </div>
                </>
            )}

            {step === 'experience' && (
                <>
                    <h3 className={styles.title}>주차는 어땠나요?</h3>
                    <div className={styles.optionsGrid}>
                        <button
                            onClick={() => handleExperienceSelect('문제없음')}
                            disabled={loading}
                            className={classNames(styles.optionBtn, styles.optionBtnGreen)}
                        >
                            <span className={styles.emoji}>😊</span>
                            <span className={styles.label}>문제없었어요</span>
                        </button>
                        <button
                            onClick={() => handleExperienceSelect('조금불편')}
                            disabled={loading}
                            className={classNames(styles.optionBtn, styles.optionBtnYellow)}
                        >
                            <span className={styles.emoji}>😐</span>
                            <span className={styles.label}>조금 불편했어요</span>
                        </button>
                        <button
                            onClick={() => handleExperienceSelect('못함')}
                            disabled={loading}
                            className={classNames(styles.optionBtn, styles.optionBtnRed)}
                        >
                            <span className={styles.emoji}>😢</span>
                            <span className={styles.label}>못 했어요</span>
                        </button>
                        <button
                            onClick={() => handleExperienceSelect('모름')}
                            disabled={loading}
                            className={styles.optionBtn}
                        >
                            <span className={styles.emoji}>🤔</span>
                            <span className={styles.labelMuted}>잘 모르겠어요</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
