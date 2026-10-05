"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import ProfileEditor from "@/components/ProfileEditor";

type Profile = { id: string; name: string; avatar_path: string | null; bio: string | null };

export default function VoiceProfileSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !user) { router.replace("/login?redirect=/lines/mypage/profile"); return; }
      const result = await supabase.from("users").select("id, name, avatar_path, bio").eq("id", user.id).single();
      if (!active) return;
      if (result.error) setErrorMessage("プロフィールを読み込めませんでした。再読み込みしてください。");
      else { setProfile(result.data as Profile); setBio(result.data.bio ?? ""); }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [router]);

  async function saveBio(event: FormEvent) {
    event.preventDefault();
    if (!profile || saving) return;
    setSaving(true); setMessage(""); setErrorMessage("");
    try {
      const result = await createClient().from("users").update({ bio: bio.trim() || null, updated_at: new Date().toISOString() }).eq("id", profile.id).select("bio").single();
      if (result.error) throw result.error;
      setBio(result.data.bio ?? ""); setMessage("自己紹介を保存しました。");
    } catch { setErrorMessage("自己紹介を保存できませんでした。もう一度お試しください。"); }
    finally { setSaving(false); }
  }

  return <><SiteHeader /><main className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-900 sm:px-6"><div className="mx-auto max-w-3xl">
    <Link href="/lines/mypage" className="text-sm font-bold text-blue-700 underline">← マイページへ戻る</Link>
    <h1 className="my-6 text-2xl font-bold">プロフィールを編集</h1>
    {errorMessage && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}
    {loading ? <p className="py-10 text-center text-neutral-500">読み込み中…</p> : profile && <>
      <ProfileEditor userId={profile.id} name={profile.name} avatarPath={profile.avatar_path} onSaved={(name, path) => setProfile({ ...profile, name, avatar_path: path })} />
      <form onSubmit={saveBio} className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <label className="block text-sm font-bold">自己紹介<textarea value={bio} onChange={(event) => setBio(event.target.value)} disabled={saving} maxLength={500} rows={5} className="mt-3 w-full rounded-xl border p-3 font-normal" /></label>
        <p className="mt-2 text-xs text-neutral-500">公開プロフィールに表示されます。</p>
        <button disabled={saving} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "保存中…" : "自己紹介を保存"}</button>
        {message && <p role="status" className="mt-4 text-sm text-green-700">{message}</p>}
      </form>
      <Link href={`/users/${profile.id}`} className="mt-5 inline-block text-sm font-bold text-blue-700 underline">公開プロフィールを見る</Link>
    </>}
  </div></main></>;
}
