"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

type Line = { id: string; character_id: string; title: string; body: string; direction: string | null; category: string | null };
type Voice = { id: string; user_id: string; audio_url: string; note: string | null; created_at: string };
type Comment = { id: string; voice_post_id: string; user_id: string; body: string; created_at: string };

export default function LineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [line, setLine] = useState<Line | null>(null);
  const [character, setCharacter] = useState("");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [likes, setLikes] = useState<Record<string, string[]>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const [{ data: auth }, lineResult, voiceResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("voice_lines").select("id, character_id, title, body, direction, category").eq("id", id).eq("status", "published").maybeSingle(),
      supabase.from("voice_posts").select("id, user_id, audio_url, note, created_at").eq("line_id", id).order("created_at", { ascending: false }),
    ]);
    setUserId(auth.user?.id ?? null);
    if (lineResult.data) {
      setLine(lineResult.data as Line);
      const { data } = await supabase.from("voice_characters").select("name").eq("id", lineResult.data.character_id).maybeSingle();
      setCharacter(data?.name ?? "キャラクター");
    }
    const voiceRows = (voiceResult.data ?? []) as Voice[];
    setVoices(voiceRows);
    const voiceIds = voiceRows.map((v) => v.id);
    const userIds = [...new Set(voiceRows.map((v) => v.user_id))];
    const [userResult, likeResult, commentResult] = await Promise.all([
      userIds.length ? supabase.from("users").select("id, name").in("id", userIds) : Promise.resolve({ data: [] }),
      voiceIds.length ? supabase.from("voice_likes").select("voice_post_id, user_id").in("voice_post_id", voiceIds) : Promise.resolve({ data: [] }),
      voiceIds.length ? supabase.from("voice_comments").select("id, voice_post_id, user_id, body, created_at").in("voice_post_id", voiceIds).order("created_at") : Promise.resolve({ data: [] }),
    ]);
    const commentRows = (commentResult.data ?? []) as Comment[];
    const allUserIds = [...new Set([...(userResult.data ?? []).map((u) => u.id), ...commentRows.map((c) => c.user_id)])];
    const { data: allUsers } = allUserIds.length ? await supabase.from("users").select("id, name").in("id", allUserIds) : { data: [] };
    setNames(Object.fromEntries((allUsers ?? []).map((u) => [u.id, u.name || "名前未登録"])));
    setLikes((likeResult.data ?? []).reduce<Record<string, string[]>>((map, item) => { (map[item.voice_post_id] ??= []).push(item.user_id); return map; }, {}));
    setComments(commentRows);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [id]);

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!userId) { router.push(`/login?redirect=/lines/${id}`); return; }
    if (!file) return;
    setBusy(true); setMessage("");
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "webm";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const uploadResult = await supabase.storage.from("voice-recordings").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadResult.error) { setMessage(`アップロードに失敗しました：${uploadResult.error.message}`); setBusy(false); return; }
    const audioUrl = supabase.storage.from("voice-recordings").getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from("voice_posts").insert({ line_id: id, user_id: userId, audio_url: audioUrl, storage_path: path, note: note.trim() || null });
    if (error) { await supabase.storage.from("voice-recordings").remove([path]); setMessage(`投稿に失敗しました：${error.message}`); }
    else { setFile(null); setNote(""); setMessage("音声を投稿しました。"); await load(); }
    setBusy(false);
  }

  async function toggleLike(voiceId: string) {
    if (!userId) { router.push(`/login?redirect=/lines/${id}`); return; }
    const supabase = createClient();
    const liked = (likes[voiceId] ?? []).includes(userId);
    const result = liked ? await supabase.from("voice_likes").delete().eq("voice_post_id", voiceId).eq("user_id", userId) : await supabase.from("voice_likes").insert({ voice_post_id: voiceId, user_id: userId });
    if (!result.error) await load();
  }

  async function addComment(voiceId: string) {
    const body = drafts[voiceId]?.trim();
    if (!userId) { router.push(`/login?redirect=/lines/${id}`); return; }
    if (!body) return;
    const { error } = await createClient().from("voice_comments").insert({ voice_post_id: voiceId, user_id: userId, body });
    if (!error) { setDrafts((current) => ({ ...current, [voiceId]: "" })); await load(); }
  }

  return <main className="min-h-screen bg-neutral-100 text-neutral-900"><SiteHeader /><div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <Link href="/lines" className="text-sm font-bold text-neutral-600 underline underline-offset-4">← セリフ一覧へ戻る</Link>
    {loading ? <div className="mt-6 rounded-3xl bg-white p-10 text-center">読み込んでいます…</div> : !line ? <div className="mt-6 rounded-3xl bg-white p-10 text-center">セリフが見つかりません。</div> : <>
      <article className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm"><div className="border-b border-neutral-100 p-6 sm:p-10"><div className="flex gap-3">{line.category && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{line.category}</span>}<span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold">{character}</span></div><h1 className="mt-5 text-3xl font-black">{line.title}</h1><blockquote className="mt-7 rounded-2xl bg-neutral-50 p-6 text-xl font-bold leading-9">「{line.body}」</blockquote>{line.direction && <p className="mt-5 text-sm leading-7 text-neutral-600"><b>演技メモ：</b>{line.direction}</p>}</div>
      <form onSubmit={upload} className="p-6 sm:p-10"><h2 className="text-xl font-bold">このセリフに声をつける</h2><p className="mt-2 text-sm text-neutral-500">MP3 / WAV / M4A / WebM / OGG、20MBまで</p><label className="mt-5 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-7 text-center"><b className="text-blue-700">{file?.name || "音声ファイルを選ぶ"}</b><input type="file" accept="audio/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="投稿メモ（任意）" className="mt-4 w-full rounded-xl border border-neutral-300 px-4 py-3"/><button disabled={!file || busy} className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white disabled:bg-neutral-300">{busy ? "投稿中…" : userId ? "声を投稿する" : "ログインして投稿する"}</button>{message && <p className="mt-3 text-sm text-blue-700">{message}</p>}</form></article>
      <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8"><div className="flex items-end justify-between"><div><p className="text-sm font-bold text-blue-600">VOICES</p><h2 className="mt-2 text-2xl font-bold">みんなの声</h2></div><span className="text-sm text-neutral-500">{voices.length}件</span></div>
      <div className="mt-6 space-y-4">{voices.map((voice) => { const voiceComments = comments.filter((c) => c.voice_post_id === voice.id); const liked = Boolean(userId && (likes[voice.id] ?? []).includes(userId)); return <article key={voice.id} className="rounded-2xl border border-neutral-200 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/users/${voice.user_id}`} className="font-bold hover:text-blue-600 hover:underline">{names[voice.user_id] ?? "名前未登録"}</Link><p className="mt-1 text-xs text-neutral-400">{new Date(voice.created_at).toLocaleDateString("ja-JP")}</p></div><button onClick={() => toggleLike(voice.id)} className={`rounded-xl px-4 py-2 text-sm ${liked ? "bg-rose-50 font-bold text-rose-600" : "bg-neutral-100"}`}>{liked ? "♥" : "♡"} {(likes[voice.id] ?? []).length}</button></div><audio controls preload="metadata" src={voice.audio_url} className="mt-4 w-full" />{voice.note && <p className="mt-3 rounded-xl bg-neutral-50 px-4 py-3 text-sm">{voice.note}</p>}<div className="mt-5 border-t border-neutral-100 pt-4"><b className="text-sm">コメント {voiceComments.length}</b><div className="mt-3 space-y-2">{voiceComments.map((comment) => <p key={comment.id} className="rounded-xl bg-neutral-50 px-4 py-3 text-sm"><Link href={`/users/${comment.user_id}`} className="mr-2 font-bold text-blue-700">{names[comment.user_id] ?? "ユーザー"}</Link>{comment.body}</p>)}</div><div className="mt-3 flex gap-2"><input value={drafts[voice.id] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [voice.id]: e.target.value }))} maxLength={1000} placeholder={userId ? "この声にコメント" : "ログインしてコメント"} className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-sm"/><button onClick={() => addComment(voice.id)} className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white">送信</button></div></div></article>; })}{voices.length === 0 && <p className="py-8 text-center text-neutral-500">まだ音声投稿はありません。最初の声を投稿してみませんか？</p>}</div></section>
    </>}</div></main>;
}
