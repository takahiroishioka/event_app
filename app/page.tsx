"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ImageCarousel, { type CarouselImage } from "@/components/ImageCarousel";
import SiteHeader from "@/components/SiteHeader";
import BannerSection, { type Banner } from "@/components/BannerSection";
import SocialFooter from "@/components/SocialFooter";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  start_at: string | null;
  location: string | null;
  fee: number;
  image_url: string | null;
};

type TopPageSettings = {
  site_name: string;
  hero_title: string;
  hero_description: string;
};

const defaultSettings: TopPageSettings = {
  site_name: "TYPESTYLE EVENT",
  hero_title: "イベントを見つけよう",
  hero_description: "開催予定のイベントをチェックして、気になるイベントに参加できます。",
};

const defaultFooterSettings = {
  brand_name: "shiokan",
  instagram_url: null,
  x_url: null,
  youtube_url: null,
};

export default function Home() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [topImages, setTopImages] = useState<CarouselImage[]>([]);
  const [settings, setSettings] = useState<TopPageSettings>(defaultSettings);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [footerSettings, setFooterSettings] = useState(defaultFooterSettings);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      const supabase = createClient();
      const [eventResult, imageResult, settingsResult, bannerResult, footerResult] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, description, start_at, location, fee, image_url")
          .eq("status", "published")
          .order("start_at", { ascending: true, nullsFirst: false }),
        supabase
          .from("site_images")
          .select("id, image_url, alt_text, link_url")
          .eq("placement", "top")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("top_page_settings")
          .select("site_name, hero_title, hero_description")
          .eq("id", true)
          .maybeSingle(),
        supabase
          .from("banners")
          .select("id, title, link_url")
          .eq("placement", "top")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("footer_settings")
          .select("brand_name, instagram_url, x_url, youtube_url")
          .eq("id", true)
          .maybeSingle(),
      ]);

      if (!active) return;

      if (eventResult.error) {
        console.error("イベント一覧取得エラー:", eventResult.error);
        setErrorMessage("イベントを読み込めませんでした。時間をおいて再度お試しください。");
      } else {
        setEvents((eventResult.data ?? []) as EventRow[]);
      }

      if (!imageResult.error) {
        setTopImages((imageResult.data ?? []) as CarouselImage[]);
      }

      if (!settingsResult.error && settingsResult.data) {
        setSettings(settingsResult.data as TopPageSettings);
      }

      if (!footerResult.error && footerResult.data) {
        setFooterSettings(footerResult.data);
      }

      if (!bannerResult.error && bannerResult.data?.length) {
        const bannerIds = bannerResult.data.map((banner) => banner.id);
        const { data: bannerImages } = await supabase
          .from("site_images")
          .select("id, image_url, alt_text, banner_id")
          .in("banner_id", bannerIds)
          .eq("placement", "banner")
          .eq("is_active", true)
          .order("sort_order");
        if (active) setBanners(bannerResult.data.map((banner) => ({
          ...banner,
          images: (bannerImages ?? []).filter((image) => image.banner_id === banner.id),
        })) as Banner[]);
      }

      setLoading(false);
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-neutral-100">
      <SiteHeader siteName={settings.site_name} />

      {topImages.length > 0 && (
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <ImageCarousel images={topImages} className="w-full" />
        </div>
      )}

      <section className="bg-white px-4 py-16 text-neutral-900 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold tracking-widest text-blue-600">EVENTS</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            {settings.hero_title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600">
            {settings.hero_description}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-blue-600">UPCOMING</p>
            <h2 className="mt-2 text-3xl font-black text-neutral-900">イベント一覧</h2>
          </div>
          {!loading && !errorMessage && (
            <p className="text-sm text-neutral-500">{events.length}件</p>
          )}
        </div>

        {loading && (
          <div className="rounded-3xl bg-white p-10 text-center text-neutral-500 shadow-sm">
            イベントを読み込んでいます…
          </div>
        )}

        {errorMessage && (
          <div className="rounded-3xl bg-red-50 p-6 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && events.length === 0 && (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-bold text-neutral-800">現在、公開中のイベントはありません。</p>
            <p className="mt-2 text-sm text-neutral-500">新しいイベントの公開をお待ちください。</p>
          </div>
        )}

        {!loading && !errorMessage && events.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`} className="block overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="grid grid-cols-[55%_45%]">
                  <div className="aspect-video overflow-hidden bg-neutral-200">
                    {event.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 px-3 text-center text-xs font-bold text-blue-700">
                        {settings.site_name}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">受付中</span>
                      <span className="text-xs font-bold text-neutral-600">{formatFee(event.fee)}</span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs leading-5 text-neutral-500">
                      <p>{formatDate(event.start_at)}</p>
                      <p>{event.location || "会場未定"}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-100 p-4 sm:p-5">
                  <h3 className="w-full text-base font-bold leading-6 text-neutral-900 sm:text-lg">{event.title}</h3>
                  <p className="mt-2 line-clamp-2 w-full text-xs leading-5 text-neutral-600 sm:text-sm">
                    {event.description || "イベントの詳細をご確認ください。"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <SocialFooter settings={footerSettings} />
      <BannerSection banners={banners} />
    </main>
  );
}

function formatDate(value: string | null) {
  if (!value) return "日時未定";

  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFee(fee: number) {
  return fee === 0 ? "無料" : `${fee.toLocaleString("ja-JP")}円`;
}
