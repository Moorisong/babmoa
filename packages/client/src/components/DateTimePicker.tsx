'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DateTimePickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minDate?: Date;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export default function DateTimePicker({
    value,
    onChange,
    placeholder = '마감 시간을 선택하세요',
    minDate = new Date(),
}: DateTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    // 현재 선택된 날짜 파싱
    const selectedDate = value ? new Date(value) : null;
    const now = new Date();
    const [viewMonth, setViewMonth] = useState(() => {
        const d = selectedDate || now;
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [selectedHour, setSelectedHour] = useState(selectedDate?.getHours() ?? now.getHours());
    const [selectedMinute, setSelectedMinute] = useState(() => {
        if (selectedDate) return selectedDate.getMinutes();
        return now.getMinutes();
    });
    const [tempSelectedDate, setTempSelectedDate] = useState<Date | null>(selectedDate);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 피커 열릴 때 오늘 자동 선택
    useEffect(() => {
        if (isOpen && !tempSelectedDate) {
            setTempSelectedDate(new Date());
        }
    }, [isOpen]);

    // 외부 클릭 감지
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(e.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // 모바일에서 스크롤 방지
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // 달력 데이터 생성 (항상 6줄 = 42칸 고정)
    const generateCalendarDays = () => {
        const year = viewMonth.getFullYear();
        const month = viewMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay();
        const totalDays = lastDay.getDate();

        const days: (Date | null)[] = [];

        // 이전 달 빈칸
        for (let i = 0; i < startPadding; i++) {
            days.push(null);
        }

        // 현재 달 날짜
        for (let i = 1; i <= totalDays; i++) {
            days.push(new Date(year, month, i));
        }

        // 뒤쪽 빈칸 (항상 42칸 = 6줄로 맞추기)
        while (days.length < 42) {
            days.push(null);
        }

        return days;
    };

    const handlePrevMonth = () => {
        setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
    };

    const handleDateSelect = (date: Date) => {
        setTempSelectedDate(date);
    };

    const handleConfirm = () => {
        if (tempSelectedDate) {
            const newDate = new Date(tempSelectedDate);
            newDate.setHours(selectedHour, selectedMinute, 0, 0);

            // 과거 시간 체크
            if (newDate <= new Date()) {
                alert('현재 시간 이후로 설정해주세요');
                return;
            }

            // datetime-local 형식: "YYYY-MM-DDTHH:mm"
            const year = newDate.getFullYear();
            const month = String(newDate.getMonth() + 1).padStart(2, '0');
            const day = String(newDate.getDate()).padStart(2, '0');
            const hour = String(newDate.getHours()).padStart(2, '0');
            const minute = String(newDate.getMinutes()).padStart(2, '0');

            onChange(`${year}-${month}-${day}T${hour}:${minute}`);
            setIsOpen(false);
        }
    };

    const isDateDisabled = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const isSameDay = (d1: Date | null, d2: Date | null) => {
        if (!d1 || !d2) return false;
        return (
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate()
        );
    };

    const isToday = (date: Date) => isSameDay(date, new Date());

    const formatDisplayValue = () => {
        if (!value) return null;
        const d = new Date(value);
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const dayName = DAYS[d.getDay()];
        const hour = d.getHours();
        const minute = String(d.getMinutes()).padStart(2, '0');
        const ampm = hour < 12 ? '오전' : '오후';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

        return `${month}월 ${day}일 (${dayName}) ${ampm} ${displayHour}:${minute}`;
    };

    const calendarDays = generateCalendarDays();

    const pickerContent = (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
            {/* 백드롭 */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
            />

            {/* 피커 컨테이너 */}
            <div
                ref={pickerRef}
                className="relative bg-white w-full max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl animate-slide-up overflow-hidden"
            >
                {/* 헤더 */}
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-gray-900">📅 마감 시간 선택</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* 달력 */}
                <div className="px-4 py-3">
                    {/* 월 네비게이션 */}
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={handlePrevMonth}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-gray-900">
                                {viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월
                            </span>
                            <button
                                onClick={() => {
                                    const today = new Date();
                                    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                                    setTempSelectedDate(today);
                                }}
                                className="px-2 py-0.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors"
                            >
                                오늘
                            </button>
                        </div>
                        <button
                            onClick={handleNextMonth}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* 요일 헤더 */}
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                        {DAYS.map((day, i) => (
                            <div
                                key={day}
                                className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
                                    }`}
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* 날짜 그리드 */}
                    <div className="grid grid-cols-7 gap-0.5">
                        {calendarDays.map((date, idx) => {
                            if (!date) {
                                return <div key={`empty-${idx}`} className="w-9 h-9 sm:w-8 sm:h-8" />;
                            }

                            const disabled = isDateDisabled(date);
                            const selected = isSameDay(date, tempSelectedDate);
                            const today = isToday(date);
                            const dayOfWeek = date.getDay();

                            return (
                                <button
                                    key={date.toISOString()}
                                    onClick={() => !disabled && handleDateSelect(date)}
                                    disabled={disabled}
                                    className={`
                                        w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all
                                        ${disabled
                                            ? 'text-gray-300 cursor-not-allowed'
                                            : selected
                                                ? 'bg-indigo-500 text-white shadow-md'
                                                : today
                                                    ? 'bg-indigo-50 text-indigo-600 font-bold'
                                                    : dayOfWeek === 0
                                                        ? 'text-red-500 hover:bg-red-50'
                                                        : dayOfWeek === 6
                                                            ? 'text-blue-500 hover:bg-blue-50'
                                                            : 'text-gray-700 hover:bg-gray-100'
                                        }
                                    `}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 시간 선택 */}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">⏰ 시간 선택</p>
                    <div className="flex gap-2">
                        {/* 시 */}
                        <div className="flex-1">
                            <select
                                value={selectedHour}
                                onChange={(e) => setSelectedHour(Number(e.target.value))}
                                className="w-full px-2 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-500 focus:outline-none text-center text-sm font-medium bg-white appearance-none"
                            >
                                {HOURS.map((h) => (
                                    <option key={h} value={h}>
                                        {h < 12 ? '오전' : '오후'} {h === 0 ? 12 : h > 12 ? h - 12 : h}시
                                    </option>
                                ))}
                            </select>
                        </div>
                        <span className="flex items-center text-lg font-bold text-gray-400">:</span>
                        {/* 분 */}
                        <div className="flex-1">
                            <select
                                value={selectedMinute}
                                onChange={(e) => setSelectedMinute(Number(e.target.value))}
                                className="w-full px-2 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-500 focus:outline-none text-center text-sm font-medium bg-white appearance-none"
                            >
                                {MINUTES.map((m) => (
                                    <option key={m} value={m}>
                                        {String(m).padStart(2, '0')}분
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 확인 버튼 */}
                <div className="px-4 py-3 border-t border-gray-100">
                    <button
                        onClick={handleConfirm}
                        disabled={!tempSelectedDate}
                        className="w-full py-2.5 btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {tempSelectedDate
                            ? `${tempSelectedDate.getMonth() + 1}월 ${tempSelectedDate.getDate()}일 ${selectedHour < 12 ? '오전' : '오후'} ${selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour}:${String(selectedMinute).padStart(2, '0')} 선택`
                            : '날짜를 선택해주세요'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(true)}
                className="input-field py-3 text-sm w-full cursor-pointer text-left flex items-center justify-between"
            >
                <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                    {formatDisplayValue() || placeholder}
                </span>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>

            {mounted && isOpen && createPortal(pickerContent, document.body)}
        </>
    );
}
