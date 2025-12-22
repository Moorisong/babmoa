'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
    const pathname = usePathname();
    const isHome = pathname === '/';

    return (
        <header className="sticky top-0 z-50 glass border-b border-white/20">
            <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <span className="text-2xl group-hover:animate-bounce-soft">🍚</span>
                    <span className="text-xl font-bold gradient-text">밥모아</span>
                </Link>

                {!isHome && (
                    <Link
                        href="/"
                        className="text-sm text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        새 투표
                    </Link>
                )}
            </div>
        </header>
    );
}
