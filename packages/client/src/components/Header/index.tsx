'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
    const pathname = usePathname();
    const isHome = pathname === '/';

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <Link href="/" className={styles.logoLink}>
                    <span className={styles.logoEmoji}>🍚</span>
                    <span className={styles.logoText}>밥모아</span>
                </Link>

                {!isHome && (
                    <Link href="/" className={styles.action}>
                        <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        새 투표
                    </Link>
                )}
            </div>
        </header>
    );
}
