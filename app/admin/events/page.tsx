"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { attachEventPreviewImages } from "@/lib/event-images";

const supabase = createClient();

type EventRow = {
  id: string;
  title: string;
  start_at: string | null;
  location: string | null;
  status: string;
  capacity: number | null;
  fee: number;
  image_url: string | null;
  is_ubm: boolean;
};

export default function AdminEventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "ログイン情報取得エラー:",
        userError
      );

      setMessage(
        "ログイン情報を確認できませんでした。"
      );

      setLoading(false);
      return;
    }

    if (!user) {
      router.replace(
        `/login?redirect=${encodeURIComponent(
          "/admin/events"
        )}`
      );

      return;
    }

    const { data: adminAccess } = await supabase.rpc("is_global_admin");
    setIsGlobalAdmin(Boolean(adminAccess));

    let assignedEventIds: string[] | null = null;
    if (!adminAccess) {
      const { data: managerRows, error: managerError } = await supabase
        .from("event_managers")
        .select("event_id")
        .eq("user_id", user.id);

      if (managerError) {
        setMessage(`担当イベントを確認できませんでした：${managerError.message}`);
        setLoading(false);
        return;
      }

      assignedEventIds = (managerRows ?? []).map((row) => row.event_id);
      if (assignedEventIds.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }
    }

    let eventQuery = supabase
      .from("events")
      .select(`
        id,
        title,
        start_at,
        location,
        status,
        capacity,
        fee,
        is_ubm
      `);

    if (assignedEventIds) eventQuery = eventQuery.in("id", assignedEventIds);

    const { data, error } = await eventQuery.order("start_at", {
        ascending: false,
        nullsFirst: false,
      });

    if (error) {
      console.error(
        "イベント一覧取得エラー:",
        error
      );

      setMessage(
        `イベントを取得できませんでした：${error.message}`
      );

      setLoading(false);
      return;
    }

    const eventRows = data ?? [];
    const eventIds = eventRows.map((event) => event.id);
    const { data: imageRows, error: imageError } = eventIds.length
      ? await supabase
          .from("site_images")
          .select("event_id, image_url")
          .eq("placement", "event")
          .eq("is_active", true)
          .in("event_id", eventIds)
          .order("sort_order")
          .order("created_at")
      : { data: [], error: null };

    if (imageError) console.error("イベント画像取得エラー:", imageError);
    setEvents(attachEventPreviewImages(eventRows, imageRows ?? []) as EventRow[]);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadEvents(), 0);
    return () => window.clearTimeout(timer);
  }, [loadEvents]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <p className="text-neutral-600">
          イベントを読み込んでいます...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href={isGlobalAdmin ? "/admin" : "/mypage"}
            className="text-sm font-bold text-neutral-600 underline underline-offset-4"
          >
            ← {isGlobalAdmin ? "管理画面" : "マイページ"}へ戻る
          </Link>
        </div>

        <header className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-blue-600">
                EVENT MANAGEMENT
              </p>

              <h1 className="mt-2 text-3xl font-bold text-neutral-900">
                イベント管理
              </h1>

              <p className="mt-3 text-sm leading-6 text-neutral-500">
                イベント情報の修正と、参加申請の回答確認ができます。
              </p>
            </div>

            {isGlobalAdmin && <Link
              href="/admin/events/new"
              className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-700"
            >
              ＋ イベントを作成
            </Link>}
          </div>
        </header>

        {message && (
          <p className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">
            {message}
          </p>
        )}

        {events.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-bold text-neutral-800">
              イベントはまだありません
            </p>

            <p className="mt-2 text-sm text-neutral-500">
              イベントを作成すると、ここに表示されます。
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/admin/events/${event.id}`}
                className="group flex overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex w-full flex-col">
                  <div className="aspect-video overflow-hidden bg-neutral-200">
                    {event.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-bold text-neutral-500">画像未登録</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <EventStatusBadge
                        status={event.status}
                      />

                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600">
                        {formatFee(event.fee)}
                      </span>
                      {event.is_ubm && (
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">UBM</span>
                      )}
                    </div>

                    <h2 className="mt-4 text-lg font-bold text-neutral-900">
                      {event.title}
                    </h2>

                    <div className="mt-3 space-y-1 text-sm text-neutral-500">
                      <p>
                        {formatDate(event.start_at)}
                      </p>

                      <p>
                        {event.location || "会場未定"}
                      </p>
                    </div>
                    <span
                      className="mt-5 block rounded-xl border border-neutral-300 bg-white px-5 py-3 text-center text-sm font-bold text-neutral-800 transition group-hover:bg-neutral-50"
                    >
                      管理・回答を見る
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function EventStatusBadge({
  status,
}: {
  status: string;
}) {
  const statusMap: Record<
    string,
    {
      label: string;
      className: string;
    }
  > = {
    draft: {
      label: "下書き",
      className:
        "bg-neutral-100 text-neutral-600",
    },
    published: {
      label: "公開中",
      className:
        "bg-green-100 text-green-700",
    },
    closed: {
      label: "受付終了",
      className:
        "bg-orange-100 text-orange-700",
    },
    cancelled: {
      label: "中止",
      className:
        "bg-red-100 text-red-700",
    },
  };

  const current =
    statusMap[status] ?? {
      label: status,
      className:
        "bg-neutral-100 text-neutral-600",
    };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${current.className}`}
    >
      {current.label}
    </span>
  );
}

function formatDate(
  dateValue: string | null
) {
  if (!dateValue) {
    return "日時未定";
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(dateValue));
}

function formatFee(fee: number) {
  if (fee === 0) {
    return "無料";
  }

  return `${fee.toLocaleString(
    "ja-JP"
  )}円`;
}
