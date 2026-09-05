import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://event-app-three-green.vercel.app"),
  title: "イベント申し込みサイト",
  description: "開催予定のイベントを確認し、参加を申し込めるサイトです。",
  openGraph: {
    title: "イベント申し込みサイト",
    description: "開催予定のイベントを確認し、参加を申し込めるサイトです。",
    type: "website",
    locale: "ja_JP",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "イベント申し込みサイト" }],
  },
  twitter: { card: "summary_large_image", title: "イベント申し込みサイト", description: "開催予定のイベントを確認し、参加を申し込めるサイトです。", images: ["/opengraph-image"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
