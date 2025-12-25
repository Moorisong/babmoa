import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.links}>
                <Link href="/terms" className={styles.link}>
                    이용약관
                </Link>
                <Link href="/privacy" className={styles.link}>
                    개인정보처리방침
                </Link>
            </div>
            <p>© 2025 SH.K</p>
        </footer>
    );
}
