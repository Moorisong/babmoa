import type { Metadata } from "next";
import { Footer } from "@/components";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { QueryProvider } from "@/lib";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "밥모아 - 회식 투표",
  description: "팀 회식 장소를 빠르게 정해보세요",
  metadataBase: new URL('https://babmoa-vote.vercel.app'),
  openGraph: {
    title: "밥모아 - 회식 투표",
    description: "어디서 먹을지 같이 정해요! 투표 마감 전에 참여해주세요 ⏰",
    url: "https://babmoa-vote.vercel.app",
    siteName: "밥모아",
    images: [
      {
        url: "https://babmoa-vote.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "밥모아 - 회식 투표",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Kakao SDK - integrity 제거 */}
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen`}
      >
        <QueryProvider>
          {children}
          <Footer />
        </QueryProvider>
      </body>
    </html>
  );
}
