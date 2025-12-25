'use client';

import { useEffect } from 'react';
import { cleanOldStorage } from '@/lib/utils';

export default function StorageCleaner() {
    useEffect(() => {
        // 앱 진입 시 오래된 로컬스토리지 데이터 정리
        cleanOldStorage();
    }, []);

    return null;
}
