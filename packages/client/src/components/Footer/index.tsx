import Link from 'next/link';
import styles from './Footer.module.css';
import KakaoAdFit from '../KakaoAdFit';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <KakaoAdFit
                    unit="DAN-1zvhnHbsFOj6k1eg"
                    width={320}
                    height={50}
                />
                <div className={styles.links}>
                    <Link href="/terms" className={styles.link}>
                        이용약관
                    </Link>
                    <Link href="/privacy" className={styles.link}>
                        개인정보처리방침
                    </Link>
                </div>
                <p>© 2025 SH.K</p>
            </div>
        </footer>
    );
}
