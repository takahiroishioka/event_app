"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const imageTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function ProfileIcon({ name, path, small = false }: { name: string; path: string | null; small?: boolean }) {
  const url = path ? createClient().storage.from("profile-icons").getPublicUrl(path).data.publicUrl : null;
  return <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-white bg-blue-100 font-bold text-blue-700 ${small ? "h-10 w-10 border-2 text-base" : "h-24 w-24 border-4 text-3xl"}`}>
    {/* User-uploaded images are served directly from public storage. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {url ? <img src={url} alt={`${name || "ユーザー"}のアイコン`} className="h-full w-full object-cover" /> : name.slice(0, 1) || "人"}
  </div>;
}

export default function ProfileEditor({ userId, name, avatarPath, onSaved }: {
  userId: string; name: string; avatarPath: string | null;
  onSaved: (name: string, path: string | null) => void;
}) {
  const [draftName, setDraftName] = useState(name);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeIcon, setRemoveIcon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const normalizedName = draftName.trim();
    setMessage(""); setError(false);
    if (!normalizedName || normalizedName.length > 100) { setError(true); setMessage("名前は1〜100文字で入力してください。"); return; }
    setSaving(true);
    const supabase = createClient();
    let uploaded: string | null = null;
    let committed = false;
    try {
      let nextPath = removeIcon ? null : avatarPath;
      if (file) {
        if (!imageTypes[file.type] || file.size > 5 * 1024 * 1024) throw new Error("JPEG・PNG・WebP形式の5MB以下の画像を選んでください。");
        const path = `${userId}/${crypto.randomUUID()}.${imageTypes[file.type]}`;
        const { error } = await supabase.storage.from("profile-icons").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        uploaded = path; nextPath = path;
      }
      const { error } = await supabase.rpc("update_own_profile", { p_name: normalizedName, p_avatar_path: nextPath });
      if (error) throw error;
      committed = true;
      onSaved(normalizedName, nextPath);
      setDraftName(normalizedName); setFile(null); setPreview(null); setRemoveIcon(false);
      if (input.current) input.current.value = "";
      setMessage("プロフィールを保存しました。");
      if (avatarPath && avatarPath !== nextPath && avatarPath.startsWith(`${userId}/`)) {
        const { error: cleanupError } = await supabase.storage.from("profile-icons").remove([avatarPath]);
        if (cleanupError) console.error("旧アイコンの削除に失敗:", cleanupError);
      }
    } catch (cause) {
      if (!committed) {
        if (uploaded) await supabase.storage.from("profile-icons").remove([uploaded]).catch(console.error);
        setError(true); setMessage(`保存できませんでした：${cause instanceof Error ? cause.message : (cause as { message?: string })?.message || "通信状態を確認してください。"}`);
      }
    } finally { setSaving(false); }
  }

  return <section className="mb-8 rounded-3xl bg-white p-6 text-neutral-900 shadow-sm [color-scheme:light] sm:p-8">
    <h2 className="text-xl font-bold text-neutral-900">プロフィール設定</h2>
    <p className="mt-2 text-sm text-neutral-700">名前とアイコンは公開プロフィールにも表示されます。</p>
    <form onSubmit={save} className="mt-5 space-y-5">
      <fieldset disabled={saving} className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          {file && preview ? <div className="h-24 w-24 overflow-hidden rounded-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="選択したアイコンのプレビュー" className="h-full w-full object-cover" />
          </div> : <ProfileIcon name={draftName} path={removeIcon ? null : avatarPath} />}
          <div className="min-w-0 flex-1"><label className="block text-sm font-bold">アイコン画像
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full rounded-lg text-sm text-neutral-900 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-700 file:px-4 file:py-3 file:font-bold file:text-white hover:file:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed" onChange={(e) => {
              const selected = e.target.files?.[0]; if (!selected) return;
              setMessage(""); setError(false);
              if (!imageTypes[selected.type] || selected.size > 5 * 1024 * 1024) { setError(true); setMessage("JPEG・PNG・WebP形式の5MB以下の画像を選んでください。"); e.target.value = ""; return; }
              setPreview(URL.createObjectURL(selected)); setFile(selected); setRemoveIcon(false);
            }} />
          </label><p className="mt-2 text-xs text-neutral-700">JPEG・PNG・WebP、5MB以下。中央を正方形に切り抜いて表示します。</p>
          {(avatarPath || file) && <button type="button" className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600" onClick={() => { setFile(null); setPreview(null); setRemoveIcon(true); if (input.current) input.current.value = ""; }}>アイコンを削除する</button>}</div>
        </div>
        <label className="block text-sm font-bold">名前 <span className="text-red-600">必須</span><input value={draftName} onChange={(e) => setDraftName(e.target.value)} required maxLength={100} autoComplete="name" className="mt-2 block w-full rounded-xl border border-neutral-400 bg-white px-4 py-3 text-base font-normal text-neutral-900 caret-blue-700 placeholder:text-neutral-600 focus:border-blue-600 focus:outline-2 focus:outline-blue-600 disabled:bg-neutral-100 disabled:text-neutral-700" /></label>
        <button type="submit" disabled={!draftName.trim()} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-700">{saving ? "保存中…" : "プロフィールを保存"}</button>
      </fieldset>
      {message && <p role={error ? "alert" : "status"} className={`text-sm ${error ? "text-red-600" : "text-green-700"}`}>{message}</p>}
    </form>
  </section>;
}
