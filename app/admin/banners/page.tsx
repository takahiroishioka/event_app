"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminImageManager from "@/components/AdminImageManager";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type BannerRow = {
  id: string;
  title: string;
  link_url: string;
  placement: "top" | "mypage";
  sort_order: number;
  is_active: boolean;
};

export default function AdminBannersPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [placement, setPlacement] = useState<"top" | "mypage">("top");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadBanners = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login?redirect=/admin/banners");
      return;
    }
    const { data, error } = await supabase.from("banners").select("id, title, link_url, placement, sort_order, is_active").order("sort_order");
    if (error) setMessage(`バナーを取得できませんでした：${error.message}`);
    else setBanners((data ?? []) as BannerRow[]);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBanners(), 0);
    return () => window.clearTimeout(timer);
  }, [loadBanners]);

  async function createBanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("banners").insert({
      title: title.trim(), link_url: linkUrl.trim(), placement,
      sort_order: banners.filter((banner) => banner.placement === placement).length,
    });
    setMessage(error ? `バナーを作成できませんでした：${error.message}` : "バナーを作成しました。下の画像一覧から画像を追加してください。");
    if (!error) {
      setTitle("");
      setLinkUrl("");
      await loadBanners();
    }
    setSaving(false);
  }

  async function updateBanner(banner: BannerRow) {
    setSaving(true);
    const { error } = await supabase.from("banners").update({
      title: banner.title.trim(), link_url: banner.link_url.trim(), placement: banner.placement,
      sort_order: banner.sort_order, is_active: banner.is_active, updated_at: new Date().toISOString(),
    }).eq("id", banner.id);
    setMessage(error ? `バナーを更新できませんでした：${error.message}` : "バナーを更新しました。");
    if (!error) await loadBanners();
    setSaving(false);
  }

  async function deleteBanner(id: string) {
    if (!window.confirm("このバナーと登録画像を削除しますか？")) return;
    setSaving(true);
    const { error } = await supabase.from("banners").delete().eq("id", id);
    setMessage(error ? `削除できませんでした：${error.message}` : "バナーを削除しました。");
    if (!error) await loadBanners();
    setSaving(false);
  }

  function changeBanner(id: string, values: Partial<BannerRow>) {
    setBanners((current) => current.map((banner) => banner.id === id ? { ...banner, ...values } : banner));
  }

  const inputClass = "mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 font-normal";

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="text-sm font-bold text-neutral-600 underline">← 管理画面へ戻る</Link>
        <header className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold text-blue-600">BANNERS</p>
          <h1 className="mt-2 text-3xl font-bold">バナー管理</h1>
          <p className="mt-3 text-sm text-neutral-500">TOP・マイページ下部のリンク付き画像カルーセルを管理します。</p>
        </header>

        <form onSubmit={createBanner} className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">新しいバナー</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-bold">管理名<input required value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} /></label>
            <label className="text-sm font-bold">リンク先<input required type="url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://..." className={inputClass} /></label>
            <label className="text-sm font-bold">表示場所<select value={placement} onChange={(event) => setPlacement(event.target.value as "top" | "mypage")} className={inputClass}><option value="top">TOPページ下部</option><option value="mypage">マイページ下部</option></select></label>
          </div>
          <button disabled={saving} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:bg-neutral-400">バナーを作成</button>
        </form>

        {message && <p className="mt-5 rounded-xl bg-white p-4 text-sm shadow-sm">{message}</p>}

        <div className="mt-6 space-y-6">
          {banners.map((banner) => (
            <section key={banner.id} className="rounded-3xl border-2 border-neutral-200 bg-neutral-50 p-4 sm:p-6">
              <div className="grid gap-4 rounded-2xl bg-white p-5 md:grid-cols-4">
                <label className="text-sm font-bold">管理名<input value={banner.title} onChange={(event) => changeBanner(banner.id, { title: event.target.value })} className={inputClass} /></label>
                <label className="text-sm font-bold">リンク先<input type="url" value={banner.link_url} onChange={(event) => changeBanner(banner.id, { link_url: event.target.value })} className={inputClass} /></label>
                <label className="text-sm font-bold">表示場所<select value={banner.placement} onChange={(event) => changeBanner(banner.id, { placement: event.target.value as "top" | "mypage" })} className={inputClass}><option value="top">TOPページ下部</option><option value="mypage">マイページ下部</option></select></label>
                <label className="text-sm font-bold">表示順<input type="number" value={banner.sort_order} onChange={(event) => changeBanner(banner.id, { sort_order: Number(event.target.value) })} className={inputClass} /></label>
                <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={banner.is_active} onChange={(event) => changeBanner(banner.id, { is_active: event.target.checked })} />公開</label>
                <div className="flex gap-4 md:col-span-3 md:justify-end">
                  <button type="button" disabled={saving} onClick={() => void updateBanner(banner)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">設定を保存</button>
                  <button type="button" disabled={saving} onClick={() => void deleteBanner(banner.id)} className="text-sm font-bold text-red-600 underline">削除</button>
                </div>
              </div>
              <div className="mt-4"><AdminImageManager placement="banner" bannerId={banner.id} /></div>
            </section>
          ))}
          {banners.length === 0 && <p className="rounded-3xl bg-white p-10 text-center text-neutral-500">バナーはまだありません。</p>}
        </div>
      </div>
    </main>
  );
}
