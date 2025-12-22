'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // 기본 staleTime: 5분
                        staleTime: 5 * 60 * 1000,
                        // 기본 cacheTime: 30분
                        gcTime: 30 * 60 * 1000,
                        // 윈도우 포커스 시 갱신
                        refetchOnWindowFocus: true,
                        // 마운트 시 갱신
                        refetchOnMount: true,
                        // 재시도 설정
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
