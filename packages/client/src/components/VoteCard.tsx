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
}: VoteCardProps) {
    return (
        <div
            onClick={() => !disabled && onSelect(placeId)}
            className={`
        relative p-4 rounded-xl border-2 transition-all cursor-pointer
        ${selected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
      `}
        >
            {/* 카테고리 뱃지 */}
            <span className="inline-block px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full mb-2">
                {category}
            </span>

            {/* 장소 이름 */}
            <h3 className="text-lg font-bold text-gray-900 mb-1">{name}</h3>

            {/* 주소 */}
            <p className="text-sm text-gray-500">{address}</p>

            {/* 투표 수 표시 */}
            {showCount && (
                <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${Math.min(voteCount * 10, 100)}%` }}
                        />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{voteCount}표</span>
                </div>
            )}

            {/* 선택 체크 */}
            {selected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
        </div>
    );
}
