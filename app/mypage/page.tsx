"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import SiteHeader from "@/components/SiteHeader";

const supabase = createClient();

type EventData = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  start_at: string | null;
  end_at: string | null;
  location: string | null;
  capacity: number | null;
  fee: number;
  status: string;
};

type UserEventRow = {
  id: string;
  status: string;
  checked_in_at: string | null;
  events: EventData | EventData[] | null;
};

export default function MyPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [joinedEvents, setJoinedEvents] = useState<EventData[]>([]);
  const [allEvents, setAllEvents] = useState<EventData[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadMyPage() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login?redirect=/mypage");
        return;
      }

      setUser(user);

      /*
       * public.usersから名前を取得
       */
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("プロフィール取得エラー:", profileError);
      }

      const displayName =
        profile?.name ||
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "";

      setUserName(displayName);

      /*
       * adminロールのIDを取得
       */
      const { data: adminRole, error: adminRoleError } =
        await supabase
          .from("roles")
          .select("id")
          .eq("name", "admin")
          .single();

      if (adminRoleError || !adminRole) {
        console.error(
          "adminロール取得エラー:",
          adminRoleError
        );

        setIsAdmin(false);
      } else {
        /*
         * ログイン中ユーザーにadminロールがあるか確認
         */
        const { data: userAdminRole, error: userRoleError } =
          await supabase
            .from("user_roles")
            .select("id")
            .eq("user_id", user.id)
            .eq("role_id", adminRole.id)
            .maybeSingle();

        if (userRoleError) {
          console.error(
            "ユーザーロール取得エラー:",
            userRoleError
          );

          setIsAdmin(false);
        } else {
          setIsAdmin(Boolean(userAdminRole));
        }
      }

      /*
       * 自分が参加するイベントを取得
       */
      const {
        data: userEventRows,
        error: userEventsError,
      } = await supabase
        .from("user_events")
        .select(`
          id,
          status,
          checked_in_at,
          events (
            id,
            title,
            description,
            image_url,
            start_at,
            end_at,
            location,
            capacity,
            fee,
            status
          )
        `)
        .eq("user_id", user.id)
        .in("status", [
          "reserved",
          "waiting",
          "joined",
        ])
        .order("created_at", {
          ascending: false,
        });

      if (userEventsError) {
        console.error(
          "参加イベント取得エラー:",
          userEventsError
        );
      }

      const formattedJoinedEvents =
        (userEventRows as UserEventRow[] | null)
          ?.flatMap((row) => {
            if (!row.events) {
              return [];
            }

            if (Array.isArray(row.events)) {
              return row.events;
            }

            return [row.events];
          }) ?? [];

      setJoinedEvents(formattedJoinedEvents);

      /*
       * 公開中のイベントを取得
       */
      const {
        data: publishedEvents,
        error: eventsError,
      } = await supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          image_url,
          start_at,
          end_at,
          location,
          capacity,
          fee,
          status
        `)
        .eq("status", "published")
        .order("start_at", {
          ascending: true,
        });

      if (eventsError) {
        console.error(
          "イベント取得エラー:",
          eventsError
        );

        setErrorMessage(
          "イベント情報の取得に失敗しました。"
        );
      }

      setAllEvents(publishedEvents ?? []);
      setLoading(false);
    }

    loadMyPage();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <p className="text-neutral-600">
          読み込み中...
        </p>
      </main>
    );
  }

  return (
    <>
    <SiteHeader />
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">
                マイページ
              </p>

              <h1 className="mt-2 text-3xl font-bold text-neutral-900">
                {userName
                  ? `${userName}さん、ようこそ`
                  : "ようこそ"}
              </h1>

              <p className="mt-3 text-sm text-neutral-500">
                {user?.email}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  管理者メニュー
                </Link>
              )}

            </div>
          </div>
        </header>

        {errorMessage && (
          <p className="mb-6 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <section className="mb-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-500">
                MY EVENTS
              </p>

              <h2 className="mt-1 text-2xl font-bold text-neutral-900">
                参加イベント
              </h2>
            </div>

            <span className="text-sm text-neutral-500">
              {joinedEvents.length}件
            </span>
          </div>

          {joinedEvents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
              <p className="font-medium text-neutral-700">
                参加予定のイベントはありません
              </p>

              <p className="mt-2 text-sm text-neutral-500">
                下のイベント一覧から確認できます。
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {joinedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  joined
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-500">
                EVENTS
              </p>

              <h2 className="mt-1 text-2xl font-bold text-neutral-900">
                イベント一覧
              </h2>
            </div>

            <span className="text-sm text-neutral-500">
              {allEvents.length}件
            </span>
          </div>

          {allEvents.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm">
              <p className="font-medium text-neutral-700">
                現在公開中のイベントはありません
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {allEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
    </>
  );
}

function EventCard({
  event,
  joined = false,
}: {
  event: EventData;
  joined?: boolean;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      {event.image_url ? (
        <div className="overflow-hidden bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.image_url}
            alt={event.title}
            className="aspect-[16/7] w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-[16/7] w-full items-center justify-center bg-neutral-200">
          <span className="text-sm font-medium text-neutral-500">
            イベント画像未登録
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              joined
                ? "bg-green-100 text-green-700"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {joined ? "参加予定" : "受付中"}
          </span>

          <span className="text-sm font-bold text-neutral-700">
            {formatFee(event.fee)}
          </span>
        </div>

        <h3 className="text-xl font-bold leading-8 text-neutral-900">
          {event.title}
        </h3>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
          {event.description ||
            "イベントの詳細をご確認ください。"}
        </p>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex gap-3">
            <dt className="w-12 shrink-0 font-medium text-neutral-400">
              日時
            </dt>

            <dd className="text-neutral-700">
              {formatDate(event.start_at)}
            </dd>
          </div>

          <div className="flex gap-3">
            <dt className="w-12 shrink-0 font-medium text-neutral-400">
              会場
            </dt>

            <dd className="text-neutral-700">
              {event.location || "未定"}
            </dd>
          </div>
        </dl>

        <Link
          href={`/events/${event.id}`}
          className="mt-6 block rounded-xl bg-neutral-900 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-neutral-700"
        >
          詳細を見る
        </Link>
      </div>
    </article>
  );
}

function formatDate(dateValue: string | null) {
  if (!dateValue) {
    return "日時未定";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function formatFee(fee: number) {
  if (fee === 0) {
    return "無料";
  }

  return `${fee.toLocaleString("ja-JP")}円`;
}
