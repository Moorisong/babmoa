import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="pt-4 pb-8 text-center text-xs text-gray-400">
            <div className="flex justify-center gap-4 mb-2">
                <Link href="/terms" className="hover:text-gray-600 transition-colors">
                    이용약관
                </Link>
                <Link href="/privacy" className="hover:text-gray-600 transition-colors">
                    개인정보처리방침
                </Link>
            </div>
            <p>© 2025 SH.K</p>
        </footer>
    );
}
