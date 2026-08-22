"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const inputClass = "mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function AdminUbmPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?redirect=/admin/ubm");
        return;
      }

      const { data } = await supabase.rpc("is_global_admin");
      if (!data) {
        router.replace("/mypage");
        return;
      }

      setChecking(false);
    }

    void checkAdmin();
  }, [router]);

  async function updateRole(enabled: boolean) {
    if (!email.trim()) return;

    setSaving(true);
    setMessage("");
    setIsError(false);

    const { error } = await supabase.rpc("set_ubm_user", {
      p_email: email.trim(),
      p_enabled: enabled,
    });

    if (error) {
      setIsError(true);
      setMessage(`UBM権限を更新できませんでした：${error.message}`);
    } else {
      setMessage(enabled ? "UBM権限を付与しました。" : "UBM権限を解除し、一般権限に変更しました。");
    }

    setSaving(false);
  }

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-neutral-100 text-neutral-600">管理者権限を確認しています...</main>;

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl">
        <Link href="/admin" className="text-sm font-bold text-neutral-600 underline underline-offset-4">← 管理画面へ戻る</Link>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold text-violet-600">UBM PERMISSION</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">UBM権限管理</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-500">UBM権限のユーザーは、UBM対象に指定されたイベントだけを表示・申込みできます。</p>

          <form className="mt-7" onSubmit={(event) => { event.preventDefault(); void updateRole(true); }}>
            <label className="block text-sm font-bold text-neutral-800">
              ユーザーのメールアドレス
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={saving} className={inputClass} />
            </label>

            {message && <p className={`mt-5 rounded-2xl px-5 py-4 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{message}</p>}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="submit" disabled={saving} className="rounded-xl bg-violet-600 px-5 py-3 font-bold text-white disabled:bg-neutral-400">UBM権限を付与</button>
              <button type="button" onClick={() => void updateRole(false)} disabled={saving || !email.trim()} className="rounded-xl border border-neutral-300 bg-white px-5 py-3 font-bold text-neutral-800 disabled:text-neutral-400">一般権限に変更</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
