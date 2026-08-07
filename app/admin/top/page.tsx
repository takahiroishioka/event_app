"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminImageManager from "@/components/AdminImageManager";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function AdminTopPage() {
  const router = useRouter();
  const [siteName, setSiteName] = useState("TYPESTYLE EVENT");
  const [heroTitle, setHeroTitle] = useState("イベントを見つけよう");
  const [heroDescription, setHeroDescription] = useState("開催予定のイベントをチェックして、気になるイベントに参加できます。");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?redirect=/admin/top");
        return;
      }
      const { data, error } = await supabase
        .from("top_page_settings")
        .select("site_name, hero_title, hero_description")
        .eq("id", true)
        .maybeSingle();
      if (!active) return;
      if (error) setMessage(`設定を取得できませんでした：${error.message}`);
      if (data) {
        setSiteName(data.site_name);
        setHeroTitle(data.hero_title);
        setHeroDescription(data.hero_description);
      }
      setLoading(false);
    }
    void loadSettings();
    return () => { active = false; };
  }, [router]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const { error } = await supabase
      .from("top_page_settings")
      .update({
        site_name: siteName.trim(),
        hero_title: heroTitle.trim(),
        hero_description: heroDescription.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setMessage(error ? `保存できませんでした：${error.message}` : "トップページ設定を保存しました。");
    setSaving(false);
  }

  if (loading) return <main className="p-10 text-center">読み込み中…</main>;

  const inputClass = "mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 font-normal";

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="text-sm font-bold text-neutral-600 underline">← 管理画面へ戻る</Link>
        <header className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold text-blue-600">TOP PAGE</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">トップページ管理</h1>
          <p className="mt-3 text-sm text-neutral-500">トップページの文言とカルーセル画像を管理します。</p>
        </header>

        <form onSubmit={saveSettings} className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">表示文言</h2>
          <div className="mt-5 space-y-5">
            <label className="block text-sm font-bold">左上のサイト名
              <input value={siteName} onChange={(event) => setSiteName(event.target.value)} required className={inputClass} />
            </label>
            <label className="block text-sm font-bold">メイン見出し
              <input value={heroTitle} onChange={(event) => setHeroTitle(event.target.value)} required className={inputClass} />
            </label>
            <label className="block text-sm font-bold">見出し下の説明文
              <textarea value={heroDescription} onChange={(event) => setHeroDescription(event.target.value)} required rows={3} className={inputClass} />
            </label>
          </div>
          <button type="submit" disabled={saving} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:bg-neutral-400">
            {saving ? "保存中…" : "文言を保存"}
          </button>
          {message && <p className="mt-4 rounded-xl bg-neutral-100 p-4 text-sm">{message}</p>}
        </form>

        <div className="mt-6">
          <AdminImageManager placement="top" />
        </div>
      </div>
    </main>
  );
}
