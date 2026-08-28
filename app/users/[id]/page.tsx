"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

type Voice = { id: string; line_id: string; audio_url: string; note: string | null; created_at: string };
type Line = { id: string; title: string; character_id: string };

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<{ name: string; bio: string | null } | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [characters, setCharacters] = useState<Record<string, string>>({});
  const [likeCount, setLikeCount] = useState(0);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const [{ data: auth }, profileResult, voiceResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("users").select("name, bio").eq("id", id).maybeSingle(),
      supabase.from("voice_posts").select("id, line_id, audio_url, note, created_at").eq("user_id", id).order("created_at", { ascending: false }),
    ]);
    setCurrentUserId(auth.user?.id ?? null);
    setProfile(profileResult.data);
    setBio(profileResult.data?.bio ?? "");
    const rows = (voiceResult.data ?? []) as Voice[];
    setVoices(rows);
    const voiceIds = rows.map((v) => v.id);
    const lineIds = [...new Set(rows.map((v) => v.line_id))];
    const [lineResult, likeResult, commentResult] = await Promise.all([
      lineIds.length ? supabase.from("voice_lines").select("id, title, character_id").in("id", lineIds) : Promise.resolve({ data: [] }),
      voiceIds.length ? supabase.from("voice_likes").select("voice_post_id").in("voice_post_id", voiceIds) : Promise.resolve({ data: [] }),
      voiceIds.length ? supabase.from("voice_comments").select("voice_post_id").in("voice_post_id", voiceIds) : Promise.resolve({ data: [] }),
    ]);
    const lineRows = (lineResult.data ?? []) as Line[];
    setLines(Object.fromEntries(lineRows.map((line) => [line.id, line])));
    const charIds = [...new Set(lineRows.map((line) => line.character_id))];
    const { data: charRows } = charIds.length ? await supabase.from("voice_characters").select("id, name").in("id", charIds) : { data: [] };
    setCharacters(Object.fromEntries((charRows ?? []).map((c) => [c.id, c.name])));
    setLikeCount((likeResult.data ?? []).length);
    setCommentCounts((commentResult.data ?? []).reduce<Record<string, number>>((map, c) => { map[c.voice_post_id] = (map[c.voice_post_id] ?? 0) + 1; return map; }, {}));
    setLoading(false);
  }
  useEffect(() => { void load(); }, [id]);

  async function saveBio(event: FormEvent) {
    event.preventDefault();
    const { error } = await createClient().from("users").update({ bio: bio.trim() || null, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) { setEditing(false); await load(); }
  }

  if (loading) return <main className="min-h-screen bg-neutral-100"><SiteHeader /><div className="mx-auto max-w-4xl p-10 text-center">読み込んでいます…</div></main>;
  if (!profile) return <main className="min-h-screen bg-neutral-100"><SiteHeader /><div className="mx-auto max-w-4xl p-10 text-center">プロフィールが見つかりません。</div></main>;
  return <main className="min-h-screen bg-neutral-100 text-neutral-900"><SiteHeader /><div className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><Link href="/lines" className="text-sm font-bold text-neutral-600 underline underline-offset-4">← セリフ一覧へ戻る</Link>
    <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm"><div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-500"/><div className="px-6 pb-8 sm:px-10"><div className="-mt-12 flex items-end justify-between"><div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-blue-100 text-3xl font-black text-blue-700">{profile.name?.slice(0, 1) || "声"}</div>{currentUserId === id && <button onClick={() => setEditing(!editing)} className="rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-bold">プロフィール編集</button>}</div><h1 className="mt-5 text-3xl font-black">{profile.name || "名前未登録"}</h1>{editing ? <form onSubmit={saveBio} className="mt-5"><textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4} className="w-full rounded-xl border border-neutral-300 p-4" placeholder="自己紹介"/><button className="mt-3 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white">保存する</button></form> : <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-600">{profile.bio || "自己紹介はまだありません。"}</p>}<dl className="mt-7 flex gap-10 border-t border-neutral-100 pt-6 text-center"><div><dt className="text-xl font-black">{voices.length}</dt><dd className="text-xs text-neutral-500">投稿した声</dd></div><div><dt className="text-xl font-black">{likeCount}</dt><dd className="text-xs text-neutral-500">もらったいいね</dd></div></dl></div></section>
    <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-bold text-blue-600">VOICE POSTS</p><h2 className="mt-2 text-2xl font-bold">{profile.name}さんの声</h2><div className="mt-6 space-y-4">{voices.map((voice) => { const line = lines[voice.line_id]; return <article key={voice.id} className="rounded-2xl border border-neutral-200 p-5"><div className="flex justify-between gap-4"><div><Link href={`/lines/${voice.line_id}`} className="font-bold hover:text-blue-600">{line?.title ?? "セリフ"}</Link><p className="mt-1 text-xs text-neutral-500">{line ? characters[line.character_id] : ""}</p></div><span className="text-xs text-neutral-500">コメント {commentCounts[voice.id] ?? 0}</span></div><audio controls preload="metadata" src={voice.audio_url} className="mt-4 w-full"/>{voice.note && <p className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm">{voice.note}</p>}</article>; })}{voices.length === 0 && <p className="py-8 text-center text-neutral-500">まだ音声投稿はありません。</p>}</div></section>
  </div></main>;
}
