"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

type Character = { id: string; name: string; image_url: string | null };
type Line = { id: string; character_id: string; title: string; body: string; direction: string | null; category: string | null; published_at: string | null };

export default function LinesPage() {
  const [lines, setLines] = useState<Line[]>([]);
  const [characters, setCharacters] = useState<Record<string, Character>>({});
  const [voiceCounts, setVoiceCounts] = useState<Record<string, number>>({});
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const [lineResult, characterResult, postResult] = await Promise.all([
        supabase.from("voice_lines").select("id, character_id, title, body, direction, category, published_at").eq("status", "published").order("published_at", { ascending: false, nullsFirst: false }),
        supabase.from("voice_characters").select("id, name, image_url").eq("is_active", true).order("sort_order"),
        supabase.from("voice_posts").select("line_id"),
      ]);
      if (!active) return;
      if (lineResult.error || characterResult.error || postResult.error) {
        setError("セリフを読み込めませんでした。時間をおいて再度お試しください。");
      } else {
        setLines((lineResult.data ?? []) as Line[]);
        setCharacters(Object.fromEntries((characterResult.data ?? []).map((item) => [item.id, item as Character])));
        setVoiceCounts((postResult.data ?? []).reduce<Record<string, number>>((counts, post) => {
          counts[post.line_id] = (counts[post.line_id] ?? 0) + 1;
          return counts;
        }, {}));
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => [...new Set(lines.map((line) => line.category).filter(Boolean))] as string[], [lines]);
  const visible = category ? lines.filter((line) => line.category === category) : lines;

  return <main className="min-h-screen bg-neutral-100 text-neutral-900">
    <SiteHeader />
    <section className="bg-white px-4 py-16 sm:px-6 sm:py-20"><div className="mx-auto max-w-6xl">
      <p className="text-sm font-bold tracking-widest text-blue-600">KOELABO</p>
      <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">セリフを見つけよう</h1>
      <p className="mt-5 max-w-2xl leading-7 text-neutral-600">オリジナルキャラクターのセリフを選んで、あなたの声を投稿できます。</p>
    </div></section>
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-7 flex items-end justify-between"><div><p className="text-sm font-bold text-blue-600">LINES</p><h2 className="mt-2 text-3xl font-black">公開セリフ一覧</h2></div>{!loading && <span className="text-sm text-neutral-500">{visible.length}件</span>}</div>
      {categories.length > 0 && <div className="mb-7 rounded-2xl bg-white p-4 shadow-sm sm:flex sm:items-center sm:gap-4"><label htmlFor="category" className="text-sm font-bold">カテゴリーで検索</label><select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm sm:mt-0 sm:max-w-xs"><option value="">すべて</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>}
      {loading && <div className="rounded-3xl bg-white p-10 text-center text-neutral-500">セリフを読み込んでいます…</div>}
      {error && <div className="rounded-3xl bg-red-50 p-6 text-red-700">{error}</div>}
      {!loading && !error && visible.length === 0 && <div className="rounded-3xl bg-white p-10 text-center"><b>現在、公開中のセリフはありません。</b></div>}
      <div className="grid gap-6 md:grid-cols-2">{visible.map((line) => { const character = characters[line.character_id]; return <Link key={line.id} href={`/lines/${line.id}`} className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="grid grid-cols-[42%_58%]"><div className="aspect-video overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100">{character?.image_url ? <img src={character.image_url} alt={character.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-4xl font-black text-blue-600">{character?.name?.slice(0, 1) ?? "声"}</div>}</div><div className="p-4">{line.category && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{line.category}</span>}<p className="mt-4 text-sm font-bold text-neutral-600">{character?.name ?? "キャラクター"}</p><p className="mt-2 text-xs text-neutral-500">🎙 {voiceCounts[line.id] ?? 0}件の声</p></div></div>
        <div className="border-t border-neutral-100 p-5"><h3 className="text-lg font-bold">{line.title}</h3><p className="mt-3 line-clamp-2 text-sm leading-6 text-neutral-600">「{line.body}」</p></div>
      </Link>; })}</div>
    </section>
  </main>;
}
