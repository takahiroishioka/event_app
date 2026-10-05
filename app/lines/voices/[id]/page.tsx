import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";
import { ProfileIcon } from "@/components/ProfileEditor";
import ShareLinkButton from "@/components/ShareLinkButton";
import { voiceMetadata } from "@/lib/voice-metadata";

const getVoice = cache(async (id: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: voice, error } = await supabase.from("voice_posts")
    .select("id, user_id, line_id, audio_url, note, created_at").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!voice) return null;
  const [lineResult, authorResult] = await Promise.all([
    supabase.from("voice_lines").select("id, title, body")
      .eq("id", voice.line_id).eq("status", "published").maybeSingle(),
    supabase.rpc("get_public_voice_profile", { p_user_id: voice.user_id }).maybeSingle(),
  ]);
  if (lineResult.error) throw lineResult.error;
  if (authorResult.error) throw authorResult.error;
  if (!lineResult.data) return null;
  return { voice, line: lineResult.data, author: authorResult.data as { name: string; avatar_path: string | null } | null };
});

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getVoice(id);
  if (!data) return { title: "投稿が見つかりません | こえらぼ" };
  const title = `${data.author?.name || "投稿者"}の声「${data.line.title}」 | こえらぼ`;
  const description = data.voice.note || `「${data.line.title}」に投稿された${data.author?.name || "投稿者"}の声を聴く。`;
  return { title, description,
    openGraph: { ...voiceMetadata.openGraph, title, description, url: `/lines/voices/${id}` },
    twitter: { ...voiceMetadata.twitter, title, description },
  };
}

export default async function VoicePage({ params }: Props) {
  const { id } = await params;
  const data = await getVoice(id);
  if (!data) notFound();
  const { voice, line, author } = data;
  const authorName = author?.name || "投稿者";
  return <><SiteHeader /><main className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-900 sm:px-6"><div className="mx-auto max-w-3xl">
    <Link href={`/lines/${line.id}`} className="text-sm font-bold text-neutral-600 underline">← このセリフのみんなの声へ</Link>
    <article className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 sm:p-10">
        <p className="text-xs font-bold tracking-widest text-blue-600">KOELABO · VOICE</p>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <Link href={`/users/${voice.user_id}`} className="flex min-w-0 items-center gap-4">
            <ProfileIcon name={authorName} path={author?.avatar_path ?? null} />
            <div className="min-w-0"><p className="break-words text-2xl font-bold">{authorName}の声</p><p className="mt-2 text-xs text-neutral-500">{new Date(voice.created_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}</p></div>
          </Link>
          <ShareLinkButton path={`/lines/voices/${voice.id}`} />
        </div>
        <h1 className="mt-7 break-words text-2xl font-black sm:text-3xl"><Link href={`/lines/${line.id}`} className="text-blue-700 hover:underline">{line.title}</Link></h1>
        <audio controls preload="metadata" src={voice.audio_url} aria-label={`${authorName}の投稿音声`} className="mt-6 w-full" />
        {voice.note && <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-neutral-700">{voice.note}</p>}
      </div>
      <section className="p-6 sm:p-10"><h2 className="text-sm font-bold text-neutral-500">セリフ</h2>
        <blockquote className="mt-4 whitespace-pre-wrap break-words text-lg leading-8">「{line.body}」</blockquote>
        <Link href={`/lines/${line.id}#voice-${voice.id}`} className="mt-6 inline-block rounded-xl border px-5 py-3 text-sm font-bold text-blue-700">いいね・コメントを見る</Link>
      </section>
    </article>
  </div></main></>;
}
