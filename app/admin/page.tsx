"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminShareMenu from "@/components/AdminShareMenu";

const supabase = createClient();

type AdminUser = {
  id: string;
  name: string | null;
};

export default function AdminPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] =
    useState<AdminUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const loadAdmin = useCallback(
    async function loadAdmin() {
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
          "ログイン情報を確認できませんでした。通信状態を確認して再読み込みしてください。"
        );

        setLoading(false);
        return;
      }

      if (!user) {
        router.replace(
          `/login?redirect=${encodeURIComponent(
            "/admin"
          )}`
        );

        return;
      }

      const {
        data: adminRole,
        error: adminRoleError,
      } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "admin")
        .maybeSingle();

      if (
        adminRoleError ||
        !adminRole
      ) {
        console.error(
          "管理者ロール取得エラー:",
          adminRoleError
        );

        setMessage(
          "管理者ロールを確認できませんでした。"
        );

        setLoading(false);
        return;
      }

      const {
        data: userRole,
        error: userRoleError,
      } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq(
          "role_id",
          adminRole.id
        )
        .maybeSingle();

      if (userRoleError) {
        console.error(
          "管理者権限確認エラー:",
          userRoleError
        );

        setMessage(
          "管理者権限を確認できませんでした。"
        );

        setLoading(false);
        return;
      }

      if (!userRole) {
        router.replace("/mypage");
        return;
      }

      const {
        data: userData,
        error: userDataError,
      } = await supabase
        .from("users")
        .select("id, name")
        .eq("id", user.id)
        .maybeSingle();

      if (userDataError) {
        console.error(
          "ユーザー情報取得エラー:",
          userDataError
        );

        setMessage(
          "ユーザー情報を取得できませんでした。"
        );

        setLoading(false);
        return;
      }

      setAdminUser(
        userData
          ? {
              id: userData.id,
              name:
                userData.name ?? null,
            }
          : {
              id: user.id,
              name: null,
            }
      );

      setLoading(false);
    },
    [router]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAdmin();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAdmin]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <p className="text-neutral-600">
          管理者権限を確認しています...
        </p>
      </main>
    );
  }

  if (message) {
    return (
      <main className="min-h-screen bg-neutral-100 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-neutral-900">
            管理画面を表示できません
          </h1>

          <p className="mt-4 text-sm leading-6 text-red-700">
            {message}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={loadAdmin}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              再読み込み
            </button>

            <Link
              href="/mypage"
              className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-800 transition hover:bg-neutral-50"
            >
              マイページへ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/mypage"
            className="text-sm font-bold text-neutral-600 underline underline-offset-4"
          >
            ← マイページへ戻る
          </Link>
        </div>

        <header className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold text-blue-600">
            ADMIN
          </p>

          <h1 className="mt-2 text-3xl font-bold text-neutral-900">
            管理画面
          </h1>

          <p className="mt-3 text-sm leading-6 text-neutral-500">
            {adminUser?.name
              ? `${adminUser.name}さん、管理する項目を選択してください。`
              : "管理する項目を選択してください。"}
          </p>
        </header>

        <section className="mt-6">
          <h2 className="px-1 text-lg font-bold text-neutral-900">
            イベント
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AdminMenuCard
              href="/admin/events"
              title="イベント管理"
              description="登録済みイベントの修正と、参加者のアンケート回答を確認します。"
              actionLabel="イベントを管理"
            />

            <AdminMenuCard
              href="/admin/participants"
              title="参加者管理"
              description="すべてのイベントの参加者名、イベント名、支払い状況をまとめて確認します。"
              actionLabel="参加者を管理"
            />

            <AdminMenuCard
              href="/admin/cancellations"
              title="キャンセル申請"
              description="参加者から届いたキャンセル申請を確認し、承認します。"
              actionLabel="申請を確認"
            />

            <AdminMenuCard
              href="/admin/users"
              title="ユーザー一覧"
              description="全ユーザーの権限を確認し、UBM権限を切り替えます。"
              actionLabel="ユーザーを確認"
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="px-1 text-lg font-bold text-neutral-900">
            トップページ
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AdminMenuCard
              href="/admin/top"
              title="トップページ管理"
              description="サイト名、見出し、説明文、トップ画像のカルーセルを管理します。"
              actionLabel="トップページを管理"
            />
            <AdminMenuCard
              href="/admin/footer"
              title="フッター管理"
              description="TOPページ下部の表示名とInstagram・X・YouTubeのリンクを管理します。"
              actionLabel="フッターを管理"
            />
            <AdminMenuCard
              href="/admin/banners"
              title="バナー管理"
              description="TOPページとマイページ下部のリンク付きカルーセルバナーを管理します。"
              actionLabel="バナーを管理"
            />
          </div>
        </section>

        <AdminShareMenu />
      </div>
    </main>
  );
}

function AdminMenuCard({
  href,
  title,
  description,
  actionLabel,
}: {
  href: string;
  title: string;
  description: string;
  actionLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-52 flex-col rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-7"
    >
      <h3 className="text-xl font-bold text-neutral-900">
        {title}
      </h3>

      <p className="mt-3 flex-1 text-sm leading-7 text-neutral-500">
        {description}
      </p>

      <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-5">
        <span className="text-sm font-bold text-blue-600">
          {actionLabel}
        </span>

        <span
          aria-hidden="true"
          className="text-lg text-blue-600 transition group-hover:translate-x-1"
        >
          →
        </span>
      </div>
    </Link>
  );
}
