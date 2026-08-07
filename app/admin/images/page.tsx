"use client";

import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type EventOption = { id: string; title: string };
type SiteImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  placement: "top" | "event";
  event_id: string | null;
  sort_order: number;
  is_active: boolean;
};

export default function AdminImagesPage() {
  const router = useRouter();
  const [images, setImages] = useState<SiteImage[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [placement, setPlacement] = useState<"top" | "event">("top");
  const [eventId, setEventId] = useState("");
  const [altText, setAltText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadPage = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login?redirect=/admin/images");
      return;
    }

    const [imageResult, eventResult] = await Promise.all([
      supabase.from("site_images").select("*").order("sort_order"),
      supabase.from("events").select("id, title").order("start_at", { ascending: false }),
    ]);

    if (imageResult.error) setMessage(`画像を取得できませんでした：${imageResult.error.message}`);
    else setImages((imageResult.data ?? []) as SiteImage[]);

    if (!eventResult.error) setEvents((eventResult.data ?? []) as EventOption[]);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPage();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPage]);

  async function uploadImage(inputEvent: ChangeEvent<HTMLInputElement>) {
    const file = inputEvent.target.files?.[0];
    inputEvent.target.value = "";
    if (!file) return;
    if (placement === "event" && !eventId) {
      setMessage("イベントを選択してください。");
      return;
    }
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setMessage("5MB以下の画像ファイルを選択してください。");
      return;
    }

    setSaving(true);
    setMessage("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `site-images/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("event-images")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setMessage(`画像をアップロードできませんでした：${uploadError.message}`);
      setSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(path);
    const targetImages = images.filter(
      (image) => image.placement === placement && image.event_id === (placement === "event" ? eventId : null)
    );
    const { error } = await supabase.from("site_images").insert({
      image_url: urlData.publicUrl,
      alt_text: altText.trim() || null,
      placement,
      event_id: placement === "event" ? eventId : null,
      sort_order: targetImages.length,
      is_active: true,
    });

    setMessage(error ? `画像を登録できませんでした：${error.message}` : "画像を登録しました。");
    if (!error) {
      setAltText("");
      await loadPage();
    }
    setSaving(false);
  }

  async function updateImage(id: string, values: Partial<SiteImage>) {
    setSaving(true);
    const { error } = await supabase.from("site_images").update(values).eq("id", id);
    setMessage(error ? `更新できませんでした：${error.message}` : "画像を更新しました。");
    if (!error) await loadPage();
    setSaving(false);
  }

  async function deleteImage(id: string) {
    if (!window.confirm("この画像を一覧から削除しますか？")) return;
    setSaving(true);
    const { error } = await supabase.from("site_images").delete().eq("id", id);
    setMessage(error ? `削除できませんでした：${error.message}` : "画像を削除しました。");
    if (!error) await loadPage();
    setSaving(false);
  }

  if (loading) return <main className="p-10 text-center">読み込み中…</main>;

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="text-sm font-bold text-neutral-600 underline">← 管理画面へ戻る</Link>
        <header className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold text-blue-600">IMAGE MANAGEMENT</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">表示画像の管理</h1>
          <p className="mt-3 text-sm text-neutral-500">トップまたはイベントに複数画像を登録します。表示はすべて16:9です。</p>
        </header>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">表示先
              <select value={placement} onChange={(e) => setPlacement(e.target.value as "top" | "event")} className="mt-2 w-full rounded-xl border p-3 font-normal">
                <option value="top">トップページ</option>
                <option value="event">イベント</option>
              </select>
            </label>
            {placement === "event" && (
              <label className="text-sm font-bold">イベント
                <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="mt-2 w-full rounded-xl border p-3 font-normal">
                  <option value="">選択してください</option>
                  {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
                </select>
              </label>
            )}
          </div>
          <label className="mt-4 block text-sm font-bold">画像の説明（任意）
            <input value={altText} onChange={(e) => setAltText(e.target.value)} className="mt-2 w-full rounded-xl border p-3 font-normal" />
          </label>
          <label className="mt-5 inline-flex cursor-pointer rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
            {saving ? "処理中…" : "16:9画像を追加"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={saving} onChange={uploadImage} className="hidden" />
          </label>
          {message && <p className="mt-4 rounded-xl bg-neutral-100 p-4 text-sm">{message}</p>}
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <article key={image.id} className="overflow-hidden rounded-3xl bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.image_url} alt={image.alt_text || ""} className="aspect-video w-full object-cover" />
              <div className="p-5">
                <p className="font-bold">{image.placement === "top" ? "トップページ" : events.find((e) => e.id === image.event_id)?.title || "イベント"}</p>
                <div className="mt-4 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={image.is_active} disabled={saving} onChange={(e) => updateImage(image.id, { is_active: e.target.checked })} /> 公開
                  </label>
                  <label className="ml-auto text-sm">順番
                    <input type="number" value={image.sort_order} disabled={saving} onChange={(e) => updateImage(image.id, { sort_order: Number(e.target.value) })} className="ml-2 w-16 rounded-lg border p-2" />
                  </label>
                </div>
                <button type="button" disabled={saving} onClick={() => deleteImage(image.id)} className="mt-4 text-sm font-bold text-red-600 underline">削除</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
