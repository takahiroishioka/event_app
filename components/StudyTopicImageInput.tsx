"use client";

import { useEffect, useState } from "react";

export default function StudyTopicImageInput({ file, imageUrl, onChange }: {
  file: File | null;
  imageUrl: string;
  onChange: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
    return () => { reader.onload = null; reader.abort(); };
  }, [file]);
  const src = file ? preview : imageUrl;
  return <div className="space-y-3">
    <label className="block text-sm font-bold">勉強会の画像
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="mt-2 block w-full text-sm font-normal" onChange={(event) => {
        const selected = event.target.files?.[0];
        event.target.value = "";
        if (!selected) return;
        if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(selected.type) || selected.size > 5 * 1024 * 1024) {
          setError("5MB以下のJPEG・PNG・WebP・GIFを選択してください。");
          return;
        }
        setError(""); onChange(selected);
      }} />
    </label>
    <p className="text-xs text-neutral-500">JPEG・PNG・WebP・GIF、5MB以下。「保存する」で画像も保存されます。</p>
    {src && <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="勉強会画像のプレビュー" className="aspect-video w-full rounded-xl bg-neutral-100 object-contain" />
      <button type="button" onClick={() => { setError(""); onChange(null); }} className="text-sm font-bold text-red-700 underline">画像を外す</button>
    </>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
