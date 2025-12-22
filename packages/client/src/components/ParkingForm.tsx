'use client';

import { useState } from 'react';

type ParkingStep = 'available' | 'experience' | 'done';

interface ParkingFormProps {
    onSubmit: (data: {
        parkingAvailable: boolean;
        parkingExperience: string | null;
    }) => void;
    loading?: boolean;
}

export default function ParkingForm({ onSubmit, loading = false }: ParkingFormProps) {
    const [step, setStep] = useState<ParkingStep>('available');
    const [parkingAvailable, setParkingAvailable] = useState<boolean | null>(null);

    const handleAvailableSelect = (available: boolean | null) => {
        setParkingAvailable(available);

        if (available === false) {
            // 주차장 없음 → 바로 제출
            onSubmit({ parkingAvailable: false, parkingExperience: null });
            setStep('done');
        } else if (available === null) {
            // 잘 모름 → unknown 처리
            onSubmit({ parkingAvailable: false, parkingExperience: null });
            setStep('done');
        } else {
            // 주차장 있음 → 다음 질문
            setStep('experience');
        }
    };

    const handleExperienceSelect = (experience: string) => {
        onSubmit({ parkingAvailable: true, parkingExperience: experience });
        setStep('done');
    };

    if (step === 'done') {
        return (
            <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">기록 완료!</h3>
                <p className="text-gray-500">소중한 경험을 공유해 주셔서 감사합니다</p>
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
                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={() => handleAvailableSelect(true)}
                            disabled={loading}
                            className="p-4 text-left rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
                        >
                            <span className="text-2xl mb-2 block">🅿️</span>
                            <span className="font-medium">있었어요</span>
                        </button>
                        <button
                            onClick={() => handleAvailableSelect(false)}
                            disabled={loading}
                            className="p-4 text-left rounded-xl border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all disabled:opacity-50"
                        >
                            <span className="text-2xl mb-2 block">❌</span>
                            <span className="font-medium">없었어요</span>
                        </button>
                        <button
                            onClick={() => handleAvailableSelect(null)}
                            disabled={loading}
                            className="p-4 text-left rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-all disabled:opacity-50"
                        >
                            <span className="text-2xl mb-2 block">🤔</span>
                            <span className="font-medium text-gray-500">잘 모르겠어요</span>
                        </button>
                    </div>
                </>
            )}

            {step === 'experience' && (
                <>
                    <h3 className="text-xl font-bold text-gray-900 text-center">
                        주차는 어땠나요?
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={() => handleExperienceSelect('문제없음')}
                            disabled={loading}
                            className="p-4 text-left rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all disabled:opacity-50"
                        >
                            <span className="text-2xl mb-2 block">😊</span>
                            <span className="font-medium">문제없었어요</span>
                        </button>
                        <button
                            onClick={() => handleExperienceSelect('조금불편')}
                            disabled={loading}
                            className="p-4 text-left rounded-xl border-2 border-gray-200 hover:border-yellow-500 hover:bg-yellow-50 transition-all disabled:opacity-50"
                        >
                            <span className="text-2xl mb-2 block">😐</span>
                            <span className="font-medium">조금 불편했어요</span>
                        </button>
                        <button
                            onClick={() => handleExperienceSelect('못함')}
                            disabled={loading}
                            className="p-4 text-left rounded-xl border-2 border-gray-200 hover:border-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                        >
                            <span className="text-2xl mb-2 block">😢</span>
                            <span className="font-medium">못 했어요</span>
                        </button>
                        <button
                            onClick={() => handleExperienceSelect('모름')}
                            disabled={loading}
                            className="p-4 text-left rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-all disabled:opacity-50"
                        >
                            <span className="text-2xl mb-2 block">🤔</span>
                            <span className="font-medium text-gray-500">잘 모르겠어요</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
