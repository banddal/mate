import type { Metadata, Viewport } from "next";
import { Quicksand, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap"
});

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Mate",
  description: "상황 카드로 오늘의 mate를 찾는 모바일 웹",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#141a30"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${spaceGrotesk.variable} ${quicksand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
