import Script from 'next/script';

interface JsonLdProps {
    type: 'website' | 'organization';
}

export function JsonLd({ type }: JsonLdProps) {
    const baseUrl = 'https://babmoa-web.haroo.site';

    const websiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: '밥모아',
        alternateName: 'Babmoa',
        url: baseUrl,
        description: '팀 회식 장소를 빠르게 정해보세요. 실제 방문 기록 기반 주차 정보까지!',
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${baseUrl}/?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };

    const organizationSchema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: '밥모아',
        alternateName: 'Babmoa',
        url: baseUrl,
        logo: `${baseUrl}/og-image.png`,
        description: '회식 장소 투표 & 주차 정보 공유 서비스',
        sameAs: [],
        contactPoint: {
            '@type': 'ContactPoint',
            email: 'thiagooo@naver.com',
            contactType: 'customer service',
            availableLanguage: 'Korean',
        },
    };

    const schema = type === 'website' ? websiteSchema : organizationSchema;

    return (
        <Script
            id={`json-ld-${type}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            strategy="afterInteractive"
        />
    );
}

interface VoteRoomJsonLdProps {
    roomTitle: string;
    roomId: string;
    placesCount: number;
    deadline: string;
}

export function VoteRoomJsonLd({ roomTitle, roomId, placesCount, deadline }: VoteRoomJsonLdProps) {
    const baseUrl = 'https://babmoa-web.haroo.site';

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: roomTitle,
        description: `${placesCount}개 후보 장소 중 팀원들이 투표하여 회식 장소를 결정합니다.`,
        url: `${baseUrl}/room/${roomId}`,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
        endDate: deadline,
        organizer: {
            '@type': 'Organization',
            name: '밥모아',
            url: baseUrl,
        },
        location: {
            '@type': 'VirtualLocation',
            url: `${baseUrl}/room/${roomId}`,
        },
    };

    return (
        <Script
            id="json-ld-vote-room"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            strategy="afterInteractive"
        />
    );
}
