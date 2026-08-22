"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SiteHeader from "@/components/SiteHeader";

const supabase = createClient();

export default function UbmUpgradePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?redirect=/ubm/upgrade");
        return;
      }

      const { data, error } = await supabase.rpc("is_ubm_restricted_user");
      if (error || !data) {
        router.replace("/mypage");
        return;
      }

      setChecking(false);
    }

    void checkAccess();
  }, [router]);

  async function upgradeRole() {
    if (!window.confirm("一般権限へ変更しますか？\n変更後はすべての公開イベントを表示・申込みできます。")) return;

    setUpgrading(true);
    setMessage("");

    const { error } = await supabase.rpc("upgrade_from_ubm");
    if (error) {
      setMessage(`権限を変更できませんでした：${error.message}`);
      setUpgrading(false);
      return;
    }

    router.replace("/mypage");
    router.refresh();
  }

  if (checking) {
    return <main className="flex min-h-screen items-center justify-center bg-neutral-100 text-neutral-600">権限を確認しています...</main>;
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-neutral-100 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-xl">
          <Link href="/mypage" className="text-sm font-bold text-neutral-600 underline underline-offset-4">← マイページへ戻る</Link>

          <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-bold text-violet-600">ACCOUNT PERMISSION</p>
            <h1 className="mt-2 text-3xl font-bold text-neutral-900">一般権限へ変更</h1>
            <p className="mt-5 text-sm leading-7 text-neutral-600">
              現在はUBM対象イベントのみ表示・申込みできます。一般権限へ変更すると、すべての公開イベントを表示・申込みできるようになります。
            </p>

            {message && <p className="mt-5 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">{message}</p>}

            <button type="button" onClick={() => void upgradeRole()} disabled={upgrading} className="mt-7 w-full rounded-xl bg-violet-600 px-5 py-4 font-bold text-white transition hover:bg-violet-700 disabled:bg-neutral-400">
              {upgrading ? "変更中..." : "一般権限へ変更する"}
            </button>
          </section>
        </div>
      </main>
    </>
  );
}
