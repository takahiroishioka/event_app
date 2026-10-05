"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioLines, Heart, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import { ProfileIcon } from "@/components/ProfileEditor";
import ShareLinkButton from "@/components/ShareLinkButton";

type Line = { id: string; title: string; body: string; category: string | null };
type Voice = { id: string; user_id: string; line_id: string; audio_url: string; note: string | null; created_at: string; voice_lines: Line | Line[] };
type Author = { name: string; avatar_path: string | null };
const pageSize = 12;

export default function VoiceTimeline() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const offset = useRef(0);
  const busy = useRef(false);
  const active = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true); setError("");
    try {
      const supabase = createClient();
      const result = await supabase.from("voice_posts")
        .select("id, user_id, line_id, audio_url, note, created_at, voice_lines!inner(id, title, body, category)")
        .eq("voice_lines.status", "published").order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(offset.current, offset.current + pageSize - 1);
      if (result.error) throw result.error;
      const rows = (result.data ?? []) as Voice[];
      const ids = rows.map((voice) => voice.id);
      const authorIds = [...new Set(rows.map((voice) => voice.user_id))];
      const [profiles, likeResult, commentResult] = await Promise.all([
        Promise.all(authorIds.map(async (id) => {
          const { data, error } = await supabase.rpc("get_public_voice_profile", { p_user_id: id }).maybeSingle();
          if (error) throw error;
          return [id, data as Author | null] as const;
        })),
        ids.length ? supabase.from("voice_likes").select("voice_post_id").in("voice_post_id", ids) : Promise.resolve({ data: [], error: null }),
        ids.length ? supabase.from("voice_comments").select("voice_post_id").in("voice_post_id", ids) : Promise.resolve({ data: [], error: null }),
      ]);
      if (likeResult.error) throw likeResult.error;
      if (commentResult.error) throw commentResult.error;
      if (!active.current) return;
      const people: Record<string, Author> = {};
      for (const [id, author] of profiles) if (author) people[id] = author;
      setAuthors((current) => ({ ...current, ...people }));
      setLikes((current) => ({ ...current, ...countByPost(likeResult.data ?? []) }));
      setComments((current) => ({ ...current, ...countByPost(commentResult.data ?? []) }));
      setVoices((current) => {
        const existing = new Set(current.map((voice) => voice.id));
        return [...current, ...rows.filter((voice) => !existing.has(voice.id))];
      });
      offset.current += rows.length;
      setHasMore(rows.length === pageSize);
    } catch {
      if (active.current) setError("声を読み込めませんでした。もう一度お試しください。");
    } finally {
      busy.current = false;
      if (active.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    active.current = true;
    const timer = window.setTimeout(() => void load(), 0);
    return () => { active.current = false; window.clearTimeout(timer); };
  }, [load]);

  return <><SiteHeader /><main className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-900 sm:px-6"><div className="mx-auto max-w-3xl">
    <header className="mb-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold tracking-widest text-blue-600">KOELABO</p>
      <h1 className="mt-3 text-3xl font-black">こえのタイムライン</h1>
      <p className="mt-3 text-sm leading-7 text-neutral-500">新しく届いた声を、ひとつずつ。</p>
      <Link href="/lines" className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">セリフを選んで投稿する</Link>
    </header>
    {error && <div role="alert" className="mb-5 rounded-2xl bg-red-50 p-5 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => void load()} disabled={loading} className="mt-3 font-bold underline disabled:opacity-50">再読み込み</button></div>}
    {!loading && !error && voices.length === 0 && <section className="rounded-3xl border border-dashed border-blue-200 bg-white px-6 py-14 text-center">
      <AudioLines size={40} aria-hidden="true" className="mx-auto text-blue-400" /><h2 className="mt-5 text-xl font-bold">最初の声を、ここから。</h2>
      <p className="mt-3 text-sm leading-7 text-neutral-500">まだ声の投稿がありません。<br />好きなセリフに声をつけると、このタイムラインに届きます。</p>
      <Link href="/lines" className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white">セリフを探す</Link>
    </section>}
    <div className="space-y-5">{voices.map((voice) => {
      const line = Array.isArray(voice.voice_lines) ? voice.voice_lines[0] : voice.voice_lines;
      const author = authors[voice.user_id];
      return <article key={voice.id} className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start justify-between gap-3"><Link href={`/users/${voice.user_id}`} className="flex min-w-0 items-center gap-3"><ProfileIcon small name={author?.name || "投稿者"} path={author?.avatar_path ?? null} /><div className="min-w-0"><p className="break-words text-sm font-bold">{author?.name || "投稿者"}</p><time dateTime={voice.created_at} className="mt-1 block text-xs text-neutral-400">{new Date(voice.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div></Link><ShareLinkButton path={`/lines/voices/${voice.id}`} /></div>
        <Link href={`/lines/voices/${voice.id}`} className="mt-5 block text-lg font-bold text-blue-700 hover:underline">{line?.title || "この声を聴く"}</Link>
        {line?.body && <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words rounded-xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-600">「{line.body}」</p>}
        <audio controls preload="none" src={voice.audio_url} aria-label={`${author?.name || "投稿者"}の投稿音声`} className="mt-4 w-full" />
        {voice.note && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-neutral-700">{voice.note}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-neutral-100 pt-4 text-sm text-neutral-500"><Link href={`/lines/${voice.line_id}#voice-${voice.id}`} className="inline-flex items-center gap-2 hover:text-blue-700" aria-label={`いいね ${likes[voice.id] ?? 0}件`}><Heart size={16} aria-hidden="true" />{likes[voice.id] ?? 0}</Link><Link href={`/lines/${voice.line_id}#voice-${voice.id}`} className="inline-flex items-center gap-2 hover:text-blue-700" aria-label={`コメント ${comments[voice.id] ?? 0}件`}><MessageCircle size={16} aria-hidden="true" />{comments[voice.id] ?? 0}</Link><Link href={`/lines/voices/${voice.id}`} className="ml-auto text-xs font-bold text-blue-700">この声のページへ →</Link></div>
      </article>;
    })}</div>
    {loading && <p role="status" className="py-10 text-center text-sm text-neutral-500">声を読み込んでいます…</p>}
    {!loading && !error && hasMore && <button type="button" onClick={() => void load()} className="mt-6 w-full rounded-xl border bg-white px-5 py-4 text-sm font-bold text-blue-700">もっと声を聴く</button>}
  </div></main></>;
}

function countByPost(rows: { voice_post_id: string }[]) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.voice_post_id] = (counts[row.voice_post_id] ?? 0) + 1;
    return counts;
  }, {});
}
