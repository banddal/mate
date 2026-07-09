import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";


export const metadata: Metadata = {
  title: "Mate",
  description: "상황 카드로 오늘의 mate를 찾는 모바일 웹",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff7df"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  );
}
