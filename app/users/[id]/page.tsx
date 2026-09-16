"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import SiteHeader from "@/components/SiteHeader";
import { ProfileIcon } from "@/components/ProfileEditor";
import { createClient } from "@/lib/supabase/client";

type Profile = { name: string; bio: string | null; avatar_path: string | null };
type Voice = { id: string; user_id: string; line_id: string; audio_url: string; storage_path: string; note: string | null; created_at: string };
type Line = { id: string; title: string; body: string; category: string | null };

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [bio, setBio] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const deletingRef = useRef(false);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true); setLoadError(""); setEditing(false);
    try {
      const supabase = createClient();
      const [auth, person, posts] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("users").select("name,bio,avatar_path").eq("id", id).maybeSingle(),
        supabase.from("voice_posts").select("id,user_id,line_id,audio_url,storage_path,note,created_at").eq("user_id", id).order("created_at", { ascending: false }),
      ]);
      if (person.error) throw person.error;
      if (posts.error) throw posts.error;
      const rows = (posts.data ?? []) as Voice[];
      const lineIds = [...new Set(rows.map((voice) => voice.line_id))];
      const [lineResult, likeResult] = await Promise.all([
        lineIds.length ? supabase.from("voice_lines").select("id,title,body,category").in("id", lineIds) : Promise.resolve({ data: [], error: null }),
        rows.length ? supabase.from("voice_likes").select("voice_post_id").in("voice_post_id", rows.map((voice) => voice.id)) : Promise.resolve({ data: [], error: null }),
      ]);
      if (lineResult.error) throw lineResult.error;
      if (likeResult.error) throw likeResult.error;
      if (version !== requestVersion.current) return;
      setUid(auth.data.user?.id ?? null);
      setProfile(person.data);
      setBio(person.data?.bio ?? "");
      setVoices(rows);
      setLines(Object.fromEntries((lineResult.data ?? []).map((line) => [line.id, line])));
      setLikes((likeResult.data ?? []).reduce<Record<string, number>>((counts, like) => {
        counts[like.voice_post_id] = (counts[like.voice_post_id] ?? 0) + 1;
        return counts;
      }, {}));
    } catch (error) {
      if (version === requestVersion.current) setLoadError(`プロフィールを読み込めませんでした：${errorText(error)}`);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Loading is an asynchronous synchronization with Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => { requestVersion.current++; };
  }, [load]);

  async function saveBio(event: FormEvent) {
    event.preventDefault();
    if (uid !== id || saving) return;
    setSaving(true); setMessage("");
    try {
      const { data, error } = await createClient().from("users")
        .update({ bio: bio.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", uid).select("bio").single();
      if (error) throw error;
      setProfile((current) => current ? { ...current, bio: data.bio } : current);
      setEditing(false); setMessage("自己紹介を保存しました。");
    } catch (error) { setMessage(`保存できませんでした：${errorText(error)}`); }
    finally { setSaving(false); }
  }

  async function deleteVoice(voice: Voice) {
    if (!uid || uid !== voice.user_id || deletingRef.current) return;
    if (!window.confirm("この声の投稿を削除しますか？音声・いいね・コメントも削除され、元に戻せません。")) return;
    deletingRef.current = true;
    setDeleting(voice.id); setMessage("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("voice_posts").delete()
        .eq("id", voice.id).eq("user_id", uid).select("id").single();
      if (error) throw error;
      if (!data) throw new Error("投稿を削除できませんでした。");
      setVoices((current) => current.filter((item) => item.id !== voice.id));
      setMessage("声の投稿を削除しました。");
      if (voice.storage_path && voice.storage_path.startsWith(`${uid}/`)) {
        try {
          const { error: fileError } = await supabase.storage.from("voice-recordings").remove([voice.storage_path]);
          if (fileError) throw fileError;
        } catch (error) {
          console.error("音声ファイル削除エラー:", error);
          setMessage("投稿は削除しましたが、音声ファイルの削除に失敗しました。管理者にお問い合わせください。");
        }
      }
    } catch (error) { setMessage(`削除できませんでした：${errorText(error)}`); }
    finally { deletingRef.current = false; setDeleting(null); }
  }

  const ownPage = Boolean(uid && uid === id);
  const totalLikes = voices.reduce((total, voice) => total + (likes[voice.id] ?? 0), 0);
  return <main className="min-h-screen bg-neutral-100 text-neutral-900">
    <SiteHeader />
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/lines" className="text-sm font-bold underline">← セリフ一覧へ</Link>
      {loading ? <p className="mt-6 rounded-3xl bg-white p-10 text-center">読み込んでいます…</p>
        : loadError ? <div role="alert" className="mt-6 rounded-3xl bg-white p-6"><p className="text-red-600">{loadError}</p><button onClick={() => void load()} className="mt-4 font-bold text-blue-700">再読み込み</button></div>
        : !profile ? <p className="mt-6 rounded-3xl bg-white p-10 text-center">ユーザーが見つかりません。</p>
        : <>
          <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="px-5 pb-6 sm:px-8">
              <div className="-mt-12"><ProfileIcon name={profile.name} path={profile.avatar_path} /></div>
              <p className="mt-4 text-xs font-bold tracking-widest text-blue-600">KOELABO</p>
              <h1 className="mt-2 break-words text-2xl font-bold">{profile.name || "名前未登録"}</h1>
              {editing ? <form onSubmit={saveBio} className="mt-5">
                <label className="block text-sm font-bold">自己紹介<textarea value={bio} onChange={(event) => setBio(event.target.value)} disabled={saving} maxLength={500} rows={4} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label>
                <div className="mt-3 flex gap-3"><button disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 text-white">{saving ? "保存中…" : "保存"}</button><button type="button" disabled={saving} onClick={() => { setBio(profile.bio ?? ""); setEditing(false); }} className="rounded-xl border px-4 py-2">キャンセル</button></div>
              </form> : <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-neutral-600">{profile.bio || "自己紹介はまだありません。"}</p>}
              {ownPage && !editing && <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold text-blue-700"><button onClick={() => setEditing(true)}>自己紹介を編集</button><Link href="/mypage">名前・アイコンを設定</Link></div>}
              <div className="mt-6 flex gap-8 border-t pt-5 text-sm"><b>{voices.length} 投稿</b><b>{totalLikes} いいね</b></div>
            </div>
          </section>
          {message && <p role="status" className="mt-5 rounded-xl bg-white p-4 text-sm">{message}</p>}
          <section className="mt-6 rounded-3xl bg-white p-5 sm:p-8">
            <h2 className="text-xl font-bold">投稿した声</h2>
            {voices.length === 0 ? <div className="py-10 text-center"><p className="text-neutral-500">まだ声の投稿がありません。</p>{ownPage && <Link href="/lines" className="mt-4 inline-block font-bold text-blue-700">セリフを探す</Link>}</div>
              : <div className="mt-5 space-y-5">{voices.map((voice) => {
                const line = lines[voice.line_id];
                return <article key={voice.id} className="min-w-0 rounded-2xl border border-neutral-200 p-4 sm:p-5">
                  {line ? <><Link href={`/lines/${voice.line_id}`} className="break-words font-bold text-blue-700 hover:underline">{line.title}</Link>
                    {line.category && <p className="mt-1 text-xs text-neutral-500">{line.category}</p>}
                    <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-600">「{line.body}」</p></>
                    : <p className="font-bold text-neutral-500">非公開のセリフ</p>}
                  <audio controls preload="none" src={voice.audio_url} aria-label={`${line?.title ?? "セリフ"}への投稿音声`} className="mt-4 w-full" />
                  {voice.note && <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-neutral-50 p-3 text-sm">{voice.note}</p>}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-neutral-500"><time dateTime={voice.created_at}>{new Date(voice.created_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}</time><span className="ml-4">♥ {likes[voice.id] ?? 0}</span></p>
                    {uid === voice.user_id && <button type="button" disabled={deleting !== null} onClick={() => void deleteVoice(voice)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">{deleting === voice.id ? "削除中…" : "この投稿を削除"}</button>}
                  </div>
                </article>;
              })}</div>}
          </section>
        </>}
    </div>
  </main>;
}

function errorText(error: unknown) {
  return error && typeof error === "object" && "message" in error ? String(error.message) : "通信状態を確認してください。";
}
