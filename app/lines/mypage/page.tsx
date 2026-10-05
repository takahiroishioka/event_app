"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import ProfileEditor, { ProfileIcon } from "@/components/ProfileEditor";

type Profile = { id: string; name: string; avatar_path: string | null };
type VoicePost = {
  id: string; line_id: string; audio_url: string; note: string | null; created_at: string;
  voice_lines: { title: string } | { title: string }[] | null;
};

export default function VoiceMyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<VoicePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !user) { router.replace("/login?redirect=/lines/mypage"); return; }
      const [profileResult, postResult] = await Promise.all([
        supabase.from("users").select("id, name, avatar_path").eq("id", user.id).single(),
        supabase.from("voice_posts").select("id, line_id, audio_url, note, created_at, voice_lines(title)")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      if (profileResult.error || postResult.error) setMessage("マイページの情報を取得できませんでした。再読み込みしてください。");
      if (profileResult.data) setProfile(profileResult.data as Profile);
      setPosts((postResult.data ?? []) as VoicePost[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [router]);

  return <><SiteHeader /><main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6"><div className="mx-auto max-w-4xl">
    <header className="mb-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-bold text-blue-600">KOELABO</p>
      <h1 className="mt-2 text-3xl font-bold text-neutral-900">こえらぼのマイページ</h1>
      {profile && <div className="mt-5 flex items-center gap-4"><ProfileIcon name={profile.name} path={profile.avatar_path} /><p className="text-xl font-bold">{profile.name || "名前未登録"}</p></div>}
      <Link href="/lines" className="mt-5 inline-block text-sm font-bold text-blue-700 underline">セリフを探す</Link>
    </header>
    {message && <p role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
    {loading ? <p className="py-10 text-center text-neutral-500">読み込み中…</p> : <>
      {profile && <ProfileEditor key={profile.id} userId={profile.id} name={profile.name} avatarPath={profile.avatar_path} onSaved={(name, path) => setProfile({ ...profile, name, avatar_path: path })} />}
      <section className="mt-8"><h2 className="mb-5 text-2xl font-bold text-neutral-900">自分の投稿</h2>
        {!message && posts.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-neutral-500">まだ声を投稿していません。</p>}
        <div className="space-y-4">{posts.map((post) => {
          const line = Array.isArray(post.voice_lines) ? post.voice_lines[0] : post.voice_lines;
          return <article key={post.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <Link href={`/lines/${post.line_id}`} className="font-bold text-blue-700 underline">{line?.title ?? "セリフを見る"}</Link>
            <p className="mt-2 text-xs text-neutral-500">{new Date(post.created_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}</p>
            <audio controls preload="none" src={post.audio_url} className="mt-4 w-full" />
            {post.note && <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-600">{post.note}</p>}
          </article>;
        })}</div>
      </section>
    </>}
  </div></main></>;
}
