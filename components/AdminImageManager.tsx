"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type SiteImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_active: boolean;
};

export default function AdminImageManager({
  placement,
  eventId = null,
  bannerId = null,
}: {
  placement: "top" | "event" | "banner";
  eventId?: string | null;
  bannerId?: string | null;
}) {
  const [images, setImages] = useState<SiteImage[]>([]);
  const [altText, setAltText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadImages = useCallback(async () => {
    let query = supabase
      .from("site_images")
      .select("id, image_url, alt_text, sort_order, is_active")
      .eq("placement", placement)
      .order("sort_order");

    if (placement === "event") query = query.eq("event_id", eventId);
    else if (placement === "banner") query = query.eq("banner_id", bannerId);
    else query = query.is("event_id", null).is("banner_id", null);
    const { data, error } = await query;
    if (error) setMessage(`画像を取得できませんでした：${error.message}`);
    else setImages((data ?? []) as SiteImage[]);
  }, [bannerId, eventId, placement]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadImages(), 0);
    return () => window.clearTimeout(timer);
  }, [loadImages]);

  async function uploadImage(inputEvent: ChangeEvent<HTMLInputElement>) {
    const file = inputEvent.target.files?.[0];
    inputEvent.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setMessage("5MB以下の画像ファイルを選択してください。");
      return;
    }

    setSaving(true);
    setMessage("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const ownerId = eventId ?? bannerId ?? "top";
    const path = `site-images/${placement}/${ownerId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("event-images")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setMessage(`画像をアップロードできませんでした：${uploadError.message}`);
      setSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(path);
    const { error } = await supabase.from("site_images").insert({
      image_url: urlData.publicUrl,
      alt_text: altText.trim() || null,
      placement,
      event_id: eventId,
      banner_id: bannerId,
      sort_order: images.length,
      is_active: true,
    });

    setMessage(error ? `画像を登録できませんでした：${error.message}` : "画像を登録しました。");
    if (!error) {
      setAltText("");
      await loadImages();
    }
    setSaving(false);
  }

  async function updateImage(id: string, values: Partial<SiteImage>) {
    setSaving(true);
    const { error } = await supabase.from("site_images").update(values).eq("id", id);
    setMessage(error ? `更新できませんでした：${error.message}` : "画像を更新しました。");
    if (!error) await loadImages();
    setSaving(false);
  }

  async function deleteImage(id: string) {
    if (!window.confirm("この画像を一覧から削除しますか？")) return;
    setSaving(true);
    const { error } = await supabase.from("site_images").delete().eq("id", id);
    setMessage(error ? `削除できませんでした：${error.message}` : "画像を削除しました。");
    if (!error) await loadImages();
    setSaving(false);
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-neutral-900">カルーセル画像</h2>
      <p className="mt-2 text-sm text-neutral-500">複数登録できます。表示は16:9、数字が小さい順に表示されます。</p>
      <label className="mt-5 block text-sm font-bold">画像の説明（任意）
        <input value={altText} onChange={(event) => setAltText(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 p-3 font-normal" />
      </label>
      <label className="mt-4 inline-flex cursor-pointer rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
        {saving ? "処理中…" : "16:9画像を追加"}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={saving} onChange={uploadImage} className="hidden" />
      </label>
      {message && <p className="mt-4 rounded-xl bg-neutral-100 p-4 text-sm">{message}</p>}

      <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {images.map((image) => (
          <article key={image.id} className="overflow-hidden rounded-2xl border border-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.image_url} alt={image.alt_text || ""} className="aspect-video w-full object-cover" />
            <div className="p-4">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={image.is_active} disabled={saving} onChange={(event) => updateImage(image.id, { is_active: event.target.checked })} /> 公開
                </label>
                <label className="ml-auto text-sm">順番
                  <input type="number" value={image.sort_order} disabled={saving} onChange={(event) => updateImage(image.id, { sort_order: Number(event.target.value) })} className="ml-2 w-16 rounded-lg border p-2" />
                </label>
              </div>
              <button type="button" disabled={saving} onClick={() => deleteImage(image.id)} className="mt-4 text-sm font-bold text-red-600 underline">削除</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
