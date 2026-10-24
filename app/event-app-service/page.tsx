import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CommunityServiceLanding, { type WorkExample } from "@/components/service/CommunityServiceLanding";
const title = "夢に必要なのは、コミュニティだ。 | しお缶";
const description = "イベントを、開催して終わりにしない。イベント管理とあなたに合わせた独自SNSの制作。限定価格：初期20,000円・月額3,000円（税別）。";
export const metadata: Metadata = { title, description, alternates: { canonical: "/event-app-service" }, openGraph: { title, description, url: "/event-app-service", type: "website", locale: "ja_JP", images: [{ url: "/event-app-service/opengraph-image", width: 1200, height: 630, alt: title }] }, twitter: { card: "summary_large_image", title, description, images: ["/event-app-service/opengraph-image"] } };
export default async function Page() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_images").select("id, image_url, alt_text, link_url, placement").in("placement", ["service_work", "service_sns"]).eq("is_active", true).order("sort_order").order("created_at");
  if (error) console.error("制作実績の取得エラー:", error.message);
  const items = (data ?? []).filter((item) => item.alt_text?.trim() && item.link_url && /^https?:\/\//i.test(item.link_url)) as WorkExample[];
  return <CommunityServiceLanding works={items.filter((item) => item.placement === "service_work")} snsExamples={items.filter((item) => item.placement === "service_sns")} />;
}
