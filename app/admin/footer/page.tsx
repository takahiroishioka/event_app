"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function AdminFooterPage() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("shiokan");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login?redirect=/admin/footer"); return; }
      const { data, error } = await supabase.from("footer_settings").select("brand_name, instagram_url, x_url, youtube_url").eq("id", true).maybeSingle();
      if (!active) return;
      if (error) setMessage(`設定を取得できませんでした：${error.message}`);
      if (data) {
        setBrandName(data.brand_name);
        setInstagramUrl(data.instagram_url ?? "");
        setXUrl(data.x_url ?? "");
        setYoutubeUrl(data.youtube_url ?? "");
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
    const { error } = await supabase.from("footer_settings").update({
      brand_name: brandName.trim(), instagram_url: instagramUrl.trim() || null,
      x_url: xUrl.trim() || null, youtube_url: youtubeUrl.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", true);
    setMessage(error ? `保存できませんでした：${error.message}` : "フッター設定を保存しました。");
    setSaving(false);
  }

  if (loading) return <main className="p-10 text-center">読み込み中…</main>;
  const inputClass = "mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 font-normal";
  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="text-sm font-bold text-neutral-600 underline">← 管理画面へ戻る</Link>
        <header className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold text-blue-600">FOOTER</p><h1 className="mt-2 text-3xl font-bold">フッター管理</h1>
          <p className="mt-3 text-sm text-neutral-500">TOPページの名称とSNSリンクを編集します。</p>
        </header>
        <form onSubmit={saveSettings} className="mt-6 space-y-5 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <label className="block text-sm font-bold">表示名<input required value={brandName} onChange={(event) => setBrandName(event.target.value)} className={inputClass} /></label>
          <label className="block text-sm font-bold">Instagram URL<input type="url" value={instagramUrl} onChange={(event) => setInstagramUrl(event.target.value)} placeholder="https://www.instagram.com/..." className={inputClass} /></label>
          <label className="block text-sm font-bold">X URL<input type="url" value={xUrl} onChange={(event) => setXUrl(event.target.value)} placeholder="https://x.com/..." className={inputClass} /></label>
          <label className="block text-sm font-bold">YouTube URL<input type="url" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/..." className={inputClass} /></label>
          <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:bg-neutral-400">{saving ? "保存中…" : "設定を保存"}</button>
          {message && <p className="rounded-xl bg-neutral-100 p-4 text-sm">{message}</p>}
        </form>
      </div>
    </main>
  );
}
