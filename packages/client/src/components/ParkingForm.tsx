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
    const [parkingAvailable, setParkingAvailable] = useState<boolean | null>(null);

    const handleAvailableSelect = (available: boolean | null) => {
        setParkingAvailable(available);

        if (available === false) {
            // 주차장 없음 → 바로 제출
            onSubmit({ parkingAvailable: false, parkingExperience: null });
        } else if (available === null) {
            // 잘 모름 → unknown 처리
            onSubmit({ parkingAvailable: false, parkingExperience: null });
        } else {
            // 주차장 있음 → 다음 질문
            setStep('experience');
        }
    };

    const handleExperienceSelect = (experience: string) => {
        onSubmit({ parkingAvailable: true, parkingExperience: experience });
    };

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
