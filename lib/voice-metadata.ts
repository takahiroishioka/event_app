import type { Metadata } from "next";

const title = "こえらぼ";
const description = "セリフを見つけて、あなたの声を投稿。声の表現を楽しむ、こえらぼ。";

export const voiceMetadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    siteName: title,
    description,
    type: "website",
    locale: "ja_JP",
    images: [{ url: "/lines/opengraph-image", width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/lines/opengraph-image"],
  },
};
