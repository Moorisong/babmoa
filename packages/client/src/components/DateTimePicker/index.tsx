'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import styles from './DateTimePicker.module.css';

interface DateTimePickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minDate?: Date;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function DateTimePicker({
    value,
    onChange,
    placeholder = '마감 시간을 선택하세요',
}: DateTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (isOpen && !tempSelectedDate) {
            setTempSelectedDate(new Date());
        }
    }, [isOpen, tempSelectedDate]);

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
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const generateCalendarDays = () => {
        const year = viewMonth.getFullYear();
        const month = viewMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const days: (Date | null)[] = [];

        for (let i = 0; i < startPadding; i++) {
            days.push(null);
        }
        for (let i = 1; i <= totalDays; i++) {
            days.push(new Date(year, month, i));
        }
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

            if (newDate <= new Date()) {
                alert('현재 시간 이후로 설정해주세요');
                return;
            }

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

    const getDateClass = (date: Date) => {
        const disabled = isDateDisabled(date);
        const selected = isSameDay(date, tempSelectedDate);
        const today = isToday(date);
        const dayOfWeek = date.getDay();

        if (disabled) return styles.dateDisabled;
        if (selected) return styles.dateSelected;
        if (today) return styles.dateToday;
        if (dayOfWeek === 0) return styles.dateSun;
        if (dayOfWeek === 6) return styles.dateSat;
        return styles.dateWeek;
    };

    const getDayHeaderClass = (idx: number) => {
        if (idx === 0) return styles.dayHeaderSun;
        if (idx === 6) return styles.dayHeaderSat;
        return styles.dayHeaderWeek;
    };

    const pickerContent = (
        <div className={styles.overlay}>
            <div className={styles.backdrop} onClick={() => setIsOpen(false)} />

            <div ref={pickerRef} className={styles.container}>
                <div className={styles.header}>
                    <h3 className={styles.headerTitle}>📅 마감 시간 선택</h3>
                    <button onClick={() => setIsOpen(false)} className={styles.closeBtn}>
                        <svg className={styles.closeIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className={styles.calendarSection}>
                    <div className={styles.monthNav}>
                        <button onClick={handlePrevMonth} className={styles.navBtn}>
                            <svg className={styles.navIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className={styles.monthTitle}>
                            <span className={styles.monthText}>
                                {viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월
                            </span>
                            <button
                                onClick={() => {
                                    const today = new Date();
                                    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                                    setTempSelectedDate(today);
                                }}
                                className={styles.todayBtn}
                            >
                                오늘
                            </button>
                        </div>
                        <button onClick={handleNextMonth} className={styles.navBtn}>
                            <svg className={styles.navIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className={styles.daysGrid}>
                        {DAYS.map((day, i) => (
                            <div key={day} className={classNames(styles.dayHeader, getDayHeaderClass(i))}>
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className={styles.datesGrid}>
                        {calendarDays.map((date, idx) => {
                            if (!date) {
                                return <div key={`empty-${idx}`} className={styles.dateEmpty} />;
                            }

                            const disabled = isDateDisabled(date);

                            return (
                                <button
                                    key={date.toISOString()}
                                    onClick={() => !disabled && handleDateSelect(date)}
                                    disabled={disabled}
                                    className={classNames(styles.dateBtn, getDateClass(date))}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className={styles.timeSection}>
                    <p className={styles.timeLabel}>⏰ 시간 선택</p>
                    <div className={styles.timeInputs}>
                        <div className={styles.timeSelect}>
                            <select
                                value={selectedHour}
                                onChange={(e) => setSelectedHour(Number(e.target.value))}
                                className={styles.select}
                            >
                                {HOURS.map((h) => (
                                    <option key={h} value={h}>
                                        {h < 12 ? '오전' : '오후'} {h === 0 ? 12 : h > 12 ? h - 12 : h}시
                                    </option>
                                ))}
                            </select>
                        </div>
                        <span className={styles.timeSeparator}>:</span>
                        <div className={styles.minuteSection}>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={String(selectedMinute)}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val) && val >= 0 && val <= 59) {
                                        setSelectedMinute(val);
                                    } else if (e.target.value === '') {
                                        setSelectedMinute(0);
                                    }
                                }}
                                className={styles.minuteInput}
                            />
                            <div className={styles.quickMinutes}>
                                {[0, 10, 20, 30, 40, 50].map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setSelectedMinute(m)}
                                        className={selectedMinute === m ? styles.quickBtnActive : styles.quickBtnInactive}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button
                        onClick={handleConfirm}
                        disabled={!tempSelectedDate}
                        className={styles.confirmBtn}
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
                className={styles.trigger}
            >
                <span className={value ? styles.triggerValue : styles.triggerPlaceholder}>
                    {formatDisplayValue() || placeholder}
                </span>
                <svg className={styles.triggerIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>

            {mounted && isOpen && createPortal(pickerContent, document.body)}
        </>
    );
}
