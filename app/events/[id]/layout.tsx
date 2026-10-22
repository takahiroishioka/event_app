import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return {};

  const supabase = await createClient();
  const { data: event, error } = await supabase.from("events")
    .select("title, description")
    .eq("id", id).eq("status", "published").maybeSingle();
  if (error) console.error("イベントOGP取得エラー:", error);
  if (!event) return {};

  const { data: image, error: imageError } = await supabase.from("site_images")
    .select("image_url")
    .eq("event_id", id).eq("placement", "event").eq("is_active", true)
    .order("sort_order").order("created_at").limit(1).maybeSingle();
  if (imageError) console.error("イベントOGP画像取得エラー:", imageError);

  const title = event.title;
  const description = event.description?.replace(/\s+/g, " ").trim().slice(0, 160)
    || `「${title}」の開催情報・参加申し込みはこちら。`;
  const imageUrl = image?.image_url || "/opengraph-image";
  return {
    title,
    description,
    openGraph: {
      title, description, type: "website", locale: "ja_JP",
      url: `/events/${id}`,
      images: [{ url: imageUrl, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export default function EventLayout({ children }: { children: ReactNode }) {
  return children;
}
