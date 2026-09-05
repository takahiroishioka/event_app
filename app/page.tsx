"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ImageCarousel, { type CarouselImage } from "@/components/ImageCarousel";
import SiteHeader from "@/components/SiteHeader";
import BannerSection, { type Banner } from "@/components/BannerSection";
import { attachEventPreviewImages } from "@/lib/event-images";
import SocialFooter from "@/components/SocialFooter";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  start_at: string | null;
  location: string | null;
  fee: number;
  image_url: string | null;
  is_ubm: boolean;
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
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const availableMonths = useMemo(
    () => [...new Set(events.flatMap((event) => event.start_at ? [toMonthKey(event.start_at)] : []))],
    [events]
  );
  const visibleEvents = selectedMonth
    ? events.filter((event) => event.start_at && toMonthKey(event.start_at) === selectedMonth)
    : events;

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      let contentAudience: "general" | "ubm" = "ubm";
      if (user) {
        contentAudience = "general";
        const { data: ubmAccess } = await supabase.rpc("is_ubm_restricted_user");
        if (ubmAccess) contentAudience = "ubm";
      }
      const [eventResult, imageResult, settingsResult, bannerResult, footerResult] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, description, start_at, location, fee, is_ubm")
          .eq("status", "published")
          .order("start_at", { ascending: true, nullsFirst: false }),
        supabase
          .from("site_images")
          .select("id, image_url, alt_text, link_url, audience")
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
          .select("id, title, link_url, audience")
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
        const eventRows = eventResult.data ?? [];
        const eventIds = eventRows.map((event) => event.id);
        const { data: eventImages, error: eventImageError } = eventIds.length
          ? await supabase
              .from("site_images")
              .select("event_id, image_url")
              .eq("placement", "event")
              .eq("is_active", true)
              .in("event_id", eventIds)
              .order("sort_order")
              .order("created_at")
          : { data: [], error: null };

        if (eventImageError) console.error("イベント画像取得エラー:", eventImageError);
        setEvents(attachEventPreviewImages(eventRows, eventImages ?? []).filter((event) => !isPastEvent(event) && (contentAudience === "general" || event.is_ubm)) as EventRow[]);
      }

      if (!imageResult.error) {
        setTopImages((imageResult.data ?? []).filter((image) => contentAudience === "general" || !image.audience || image.audience === "all" || image.audience === "ubm") as CarouselImage[]);
      }

      if (!settingsResult.error && settingsResult.data) {
        setSettings(settingsResult.data as TopPageSettings);
      }

      if (!footerResult.error && footerResult.data) {
        setFooterSettings(footerResult.data);
      }

      if (!bannerResult.error && bannerResult.data?.length) {
        const visibleBanners = bannerResult.data.filter((banner) => contentAudience === "general" || !banner.audience || banner.audience === "all" || banner.audience === "ubm");
        const bannerIds = visibleBanners.map((banner) => banner.id);
        const { data: bannerImages } = await supabase
          .from("site_images")
          .select("id, image_url, alt_text, banner_id")
          .in("banner_id", bannerIds)
          .eq("placement", "banner")
          .eq("is_active", true)
          .order("sort_order");
        if (active) setBanners(visibleBanners.map((banner) => ({
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
            <p className="text-sm text-neutral-500">{visibleEvents.length}件</p>
          )}
        </div>

        {!loading && !errorMessage && availableMonths.length > 0 && (
          <div className="mb-7 rounded-2xl bg-white p-4 shadow-sm sm:flex sm:items-center sm:gap-4 sm:px-5">
            <label htmlFor="event-month" className="block shrink-0 text-sm font-bold text-neutral-800">
              開催月で検索
            </label>
            <select
              id="event-month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:mt-0 sm:max-w-xs"
            >
              <option value="">すべての月</option>
              {availableMonths.map((month) => (
                <option key={month} value={month}>{formatMonth(month)}</option>
              ))}
            </select>
          </div>
        )}

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

        {!loading && !errorMessage && events.length > 0 && visibleEvents.length === 0 && (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-bold text-neutral-800">選択した月に開催予定のイベントはありません。</p>
          </div>
        )}

        {!loading && !errorMessage && visibleEvents.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {visibleEvents.map((event) => (
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

function isPastEvent(event: EventRow) {
  return event.start_at ? new Date(event.start_at).getTime() < Date.now() : false;
}

function toMonthKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  return `${year}年${Number(month)}月`;
}


