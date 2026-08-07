"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ImageCarousel, { type CarouselImage } from "@/components/ImageCarousel";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  start_at: string | null;
  location: string | null;
  fee: number;
  image_url: string | null;
};

export default function Home() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [topImages, setTopImages] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      const supabase = createClient();
      const [eventResult, imageResult] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, description, start_at, location, fee, image_url")
          .eq("status", "published")
          .order("start_at", { ascending: true, nullsFirst: false }),
        supabase
          .from("site_images")
          .select("id, image_url, alt_text")
          .eq("placement", "top")
          .eq("is_active", true)
          .order("sort_order"),
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

      setLoading(false);
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-neutral-100">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="text-lg font-black tracking-tight text-neutral-900">
            TYPESTYLE EVENT
          </Link>

          <Link
            href="/login"
            className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-neutral-700"
          >
            ログイン
          </Link>
        </div>
      </header>

      {topImages.length > 0 && (
        <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
          <ImageCarousel images={topImages} className="rounded-3xl shadow-sm" />
        </div>
      )}

      <section className="bg-neutral-900 px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold tracking-widest text-blue-300">EVENTS</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            イベントを見つけよう
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-300">
            開催予定のイベントをチェックして、気になるイベントに参加できます。
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
              <article key={event.id} className="overflow-hidden rounded-3xl bg-white shadow-sm">
                {event.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.image_url}
                    alt=""
                    className="aspect-[16/9] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 text-sm font-bold text-blue-700">
                    TYPESTYLE EVENT
                  </div>
                )}

                <div className="p-6">
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                      {formatDate(event.start_at)}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-600">
                      {formatFee(event.fee)}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-black text-neutral-900">{event.title}</h3>
                  <p className="mt-2 text-sm text-neutral-500">{event.location || "会場未定"}</p>
                  {event.description && (
                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-neutral-600">
                      {event.description}
                    </p>
                  )}

                  <Link
                    href={`/events/${event.id}`}
                    className="mt-6 block rounded-xl border border-neutral-300 px-4 py-3 text-center text-sm font-bold text-neutral-800 transition hover:bg-neutral-50"
                  >
                    詳細を見る
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
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
