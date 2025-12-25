'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
    const pathname = usePathname();
    const isHome = pathname === '/';

    return (
        <header className="header">
            <div className="header-container">
                <Link href="/" className="header-link group">
                    <span className="text-2xl group-hover:animate-bounce-soft">🍚</span>
                    <span className="text-xl font-bold gradient-text">밥모아</span>
                </Link>

                {!isHome && (
                    <Link href="/" className="header-action">
                        <svg className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        새 투표
                    </Link>
                )}
            </div>
        </header>
    );
}
