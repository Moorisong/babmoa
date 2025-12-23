import { Metadata } from 'next';
import RoomClient from './RoomClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://babmoa-vote.vercel.app';

// 서버 사이드에서 투표방 정보 조회
async function getRoom(roomId: string) {
    try {
        const res = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
            cache: 'no-store',
        });
        const data = await res.json();
        if (data.success && data.data) {
            return data.data;
        }
        return null;
    } catch (error) {
        console.error('Failed to fetch room:', error);
        return null;
    }
}

// 동적 메타데이터 생성 (SSR)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id: roomId } = await params;
    const room = await getRoom(roomId);

    if (!room) {
        return {
            title: '밥모아 - 회식 투표',
            description: '팀 회식 장소를 빠르게 정해보세요',
        };
    }

    const title = `${room.title} - 밥모아 투표`;
    const description = '어디서 먹을지 같이 정해요! 투표 마감 전에 참여해주세요 ⏰';
    const url = `${BASE_URL}/room/${roomId}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url,
            siteName: '밥모아',
            images: [
                {
                    url: `${BASE_URL}/og-image.png`,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
            locale: 'ko_KR',
            type: 'website',
        },
    };
}

export default function RoomPage() {
    return <RoomClient />;
}
