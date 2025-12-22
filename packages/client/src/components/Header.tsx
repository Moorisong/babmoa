import Link from 'next/link';

export default function Header() {
    return (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl">🍚</span>
                    <span className="text-xl font-bold text-gray-900">밥모아</span>
                </Link>
            </div>
        </header>
    );
}
