'use client';

import { useState } from 'react';

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
            <div className="flex-center flex-col py-12 animate-fade-in">
                <div className="relative mb-6">
                    <div className="spinner"></div>
                    <div className="spinner-active"></div>
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-2">기록 중...</p>
                <p className="text-caption">잠시만 기다려주세요</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {step === 'available' && (
                <>
                    <h3 className="text-xl font-bold text-gray-900 text-center">
                        주차장이 있었나요?
                    </h3>
                    <div className="grid grid-cols-1 gap-md">
                        <button
                            onClick={() => handleAvailableSelect(true)}
                            disabled={loading}
                            className="form-option-btn form-option-btn-blue"
                        >
                            <span className="text-2xl mb-2 block">🅿️</span>
                            <span className="font-medium">있었어요</span>
                        </button>
                        <button
                            onClick={() => handleAvailableSelect(false)}
                            disabled={loading}
                            className="form-option-btn form-option-btn-orange"
                        >
                            <span className="text-2xl mb-2 block">❌</span>
                            <span className="font-medium">없었어요</span>
                        </button>
                        <button
                            onClick={() => handleAvailableSelect(null)}
                            disabled={loading}
                            className="form-option-btn"
                        >
                            <span className="text-2xl mb-2 block">🤔</span>
                            <span className="font-medium text-muted">잘 모르겠어요</span>
                        </button>
                    </div>
                </>
            )}

            {step === 'experience' && (
                <>
                    <h3 className="text-xl font-bold text-gray-900 text-center">
                        주차는 어땠나요?
                    </h3>
                    <div className="grid grid-cols-1 gap-md">
                        <button
                            onClick={() => handleExperienceSelect('문제없음')}
                            disabled={loading}
                            className="form-option-btn form-option-btn-green"
                        >
                            <span className="text-2xl mb-2 block">😊</span>
                            <span className="font-medium">문제없었어요</span>
                        </button>
                        <button
                            onClick={() => handleExperienceSelect('조금불편')}
                            disabled={loading}
                            className="form-option-btn form-option-btn-yellow"
                        >
                            <span className="text-2xl mb-2 block">😐</span>
                            <span className="font-medium">조금 불편했어요</span>
                        </button>
                        <button
                            onClick={() => handleExperienceSelect('못함')}
                            disabled={loading}
                            className="form-option-btn form-option-btn-red"
                        >
                            <span className="text-2xl mb-2 block">😢</span>
                            <span className="font-medium">못 했어요</span>
                        </button>
                        <button
                            onClick={() => handleExperienceSelect('모름')}
                            disabled={loading}
                            className="form-option-btn"
                        >
                            <span className="text-2xl mb-2 block">🤔</span>
                            <span className="font-medium text-muted">잘 모르겠어요</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
