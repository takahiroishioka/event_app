"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SocialFooter from "@/components/SocialFooter";
import BannerSection, { type Banner } from "@/components/BannerSection";

const defaultSettings = { brand_name: "shiokan", instagram_url: null, x_url: null, youtube_url: null };

export default function VoiceSiteFooter() {
  const [settings, setSettings] = useState(defaultSettings);
  const [banners, setBanners] = useState<Banner[]>([]);
  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const [footer, bannerResult, auth] = await Promise.all([
        supabase.from("footer_settings").select("brand_name, instagram_url, x_url, youtube_url").eq("id", true).maybeSingle(),
        supabase.from("banners").select("id, title, link_url, audience").eq("placement", "koelabo").eq("is_active", true).order("sort_order"),
        supabase.auth.getSession(),
      ]);
      if (!active) return;
      if (footer.data) setSettings(footer.data);
      if (footer.error) console.error("フッター取得エラー:", footer.error);
      if (bannerResult.error) { console.error("こえらぼバナー取得エラー:", bannerResult.error); return; }
      const access = auth.data.session ? await supabase.rpc("is_ubm_restricted_user") : { data: false, error: null };
      const audience = access.error ? "all" : access.data ? "ubm" : "general";
      const visible = (bannerResult.data ?? []).filter((banner) => banner.audience === "all" || banner.audience === audience);
      if (!visible.length) { if (active) setBanners([]); return; }
      const images = await supabase.from("site_images").select("id, image_url, alt_text, banner_id, audience")
        .eq("placement", "banner").eq("is_active", true).in("banner_id", visible.map((banner) => banner.id)).order("sort_order");
      if (!active) return;
      if (images.error) { console.error("バナー画像取得エラー:", images.error); return; }
      setBanners(visible.map((banner) => ({ ...banner, images: (images.data ?? []).filter((image) => image.banner_id === banner.id && (image.audience === "all" || image.audience === audience)) })));
    }
    void load();
    return () => { active = false; };
  }, []);
  return <div className="mt-auto"><SocialFooter settings={settings} /><BannerSection banners={banners} /></div>;
}
