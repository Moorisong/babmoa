'use client';

interface VoteCardProps {
    placeId: string;
    name: string;
    address: string;
    category: string;
    selected: boolean;
    onSelect: (placeId: string) => void;
    voteCount?: number;
    showCount?: boolean;
    disabled?: boolean;
    index?: number;
}

export default function VoteCard({
    placeId,
    name,
    address,
    category,
    selected,
    onSelect,
    voteCount = 0,
    showCount = false,
    disabled = false,
    index = 0,
}: VoteCardProps) {
    return (
        <div
            onClick={() => !disabled && onSelect(placeId)}
            className={`
                vote-card card p-4 transition-all
                ${selected ? 'card-selected !border-indigo-500 !bg-indigo-50/50' : ''}
                ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                animate-slide-up
            `}
            style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards' }}
        >
            {/* 카테고리 뱃지 */}
            <span className="inline-block px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full mb-3">
                {category}
            </span>

            {/* 장소 이름 */}
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                {name}
                {selected && (
                    <span className="text-indigo-500">✓</span>
                )}
            </h3>

            {/* 주소 */}
            <p className="text-sm text-gray-500 flex items-center gap-1">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {address}
            </p>

            {/* 투표 수 표시 */}
            {showCount && (
                <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${Math.min(voteCount * 20, 100)}%` }}
                        />
                    </div>
                    <span className="text-sm font-bold text-indigo-600 min-w-[3rem] text-right">
                        {voteCount}표
                    </span>
                </div>
            )}

            {/* 선택 인디케이터 */}
            {selected && (
                <div className="absolute top-3 right-3 w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg animate-scale-in">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
        </div>
    );
}
