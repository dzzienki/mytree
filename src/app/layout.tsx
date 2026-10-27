import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { withBase } from "@/lib/base-path";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mytree - 함께 쓰는 공유 캘린더 (TimeTree Clone)",
  description: "가족, 연인, 친구와 일정을 공유하고 소통하는 TimeTree 완벽 클론 웹 애플리케이션",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "mytree",
  },
  icons: {
    icon: withBase("/icons/icon.svg"),
    apple: withBase("/icons/icon.svg"),
  },
};

export const viewport: Viewport = {
  themeColor: "#10B981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
