"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import SiteHeader from "@/components/SiteHeader";
import StudyTopicDialog from "@/components/StudyTopicDialog";
import { createClient } from "@/lib/supabase/client";
import { studyTopicDetails, normalizeStudyRequest, type StudyTopic } from "@/lib/study-requests";

export default function StudyRequestsPage() {
  const [topics, setTopics] = useState<StudyTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [detailTopic, setDetailTopic] = useState<StudyTopic | null>(null);
  const [lineName, setLineName] = useState("");
  const [schedule, setSchedule] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sentTitle, setSentTitle] = useState("");
  const [lineUrl, setLineUrl] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);
  const busy = useRef(false);
  const formRef = useRef<HTMLElement>(null);
  const successRef = useRef<HTMLElement>(null);
  const selected = topics.find((topic) => topic.id === selectedId);

  function requestTopic(topic: StudyTopic) {
    setDetailTopic(null);
    setSelectedId(topic.id); setError(""); setSentTitle(""); requestId.current = null;
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formRef.current?.querySelector("input")?.focus({ preventScroll: true });
    });
  }

  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const supabase = createClient();
      const [result, footer] = await Promise.all([
        supabase.from("study_topics").select("id, title, description, image_url, meeting_format, fee, is_active, sort_order").eq("is_active", true).order("sort_order").order("created_at"),
        supabase.from("footer_settings").select("line_url").eq("id", true).maybeSingle(),
      ]);
      if (result.error) throw result.error;
      setTopics((result.data ?? []) as StudyTopic[]);
      const url = footer.data?.line_url?.trim();
      setLineUrl(url && /^https?:\/\//i.test(url) ? url : null);
    } catch { setLoadError("勉強会一覧を読み込めませんでした。時間をおいて再読み込みしてください。"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { if (selectedId) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [selectedId]);
  useEffect(() => { if (sentTitle) successRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [sentTitle]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || busy.current) return;
    setError("");
    let values;
    try { values = normalizeStudyRequest({ lineName, schedule, message }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "入力内容を確認してください。"); return; }
    busy.current = true; setSaving(true);
    try {
      requestId.current ??= crypto.randomUUID();
      const result = await createClient().rpc("submit_study_holding_request", {
        p_request_id: requestId.current, p_topic_id: selected.id, p_line_name: values.lineName,
        p_schedule: values.schedule || null, p_message: values.message || null,
      });
      if (result.error) throw result.error;
      setSentTitle(selected.title); setSelectedId(""); requestId.current = null;
      setLineName(""); setSchedule(""); setMessage("");
    } catch (cause) {
      const detail = cause && typeof cause === "object" && "message" in cause ? String(cause.message) : "通信状態を確認してください。";
      setError(`開催希望を送信できませんでした：${detail}`);
    } finally { busy.current = false; setSaving(false); }
  }

  const inputClass = "mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal text-neutral-900";
  return <><SiteHeader /><main className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-900 sm:px-6"><div className="mx-auto max-w-4xl">
    <header className="rounded-3xl bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold tracking-widest text-blue-600">STUDY REQUEST</p><h1 className="mt-3 text-3xl font-bold">勉強会開催希望一覧</h1><p className="mt-4 text-sm leading-7 text-neutral-600">受けてみたい勉強会を選んで、開催希望をお送りください。ログインせずに送信できます。ご希望をもとに日程を調整します。</p></header>
    {sentTitle && <section ref={successRef} role="status" className="mt-6 rounded-3xl border border-green-200 bg-green-50 p-6"><h2 className="text-xl font-bold text-green-800">開催希望を受け付けました</h2><p className="mt-3 text-sm leading-7 text-green-900">「{sentTitle}」のご希望を管理者へ届けました。開催・参加の確定ではありません。日程については公式LINEでご案内します。</p>{lineUrl && <a href={lineUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white">公式LINEを開く</a>}</section>}
    {loadError && <div role="alert" className="mt-6 rounded-xl bg-red-50 p-5 text-sm text-red-700"><p>{loadError}</p><button type="button" onClick={() => void load()} className="mt-3 font-bold underline">再読み込み</button></div>}
    {loading ? <p role="status" className="py-12 text-center text-neutral-500">読み込み中…</p> : !loadError && <section className="mt-6 grid gap-5 sm:grid-cols-2" aria-label="募集中の勉強会">
      {topics.map((topic) => <article key={topic.id} className={`relative flex flex-col rounded-3xl border-2 bg-white p-6 shadow-sm ${selectedId === topic.id ? "border-blue-500" : "border-transparent"}`}><button type="button" aria-label={`${topic.title}の詳細を見る`} aria-haspopup="dialog" onClick={() => setDetailTopic(topic)} className="absolute inset-0 z-0 cursor-pointer rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />{topic.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={topic.image_url} alt={topic.title} className="mb-4 aspect-video w-full rounded-xl bg-neutral-100 object-contain" />
      )}<h2 className="text-xl font-bold">{topic.title}</h2><p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-7 text-neutral-600">{topic.description || "内容の詳細はお問い合わせください。"}</p><p className="mt-auto pt-4 text-sm font-bold text-blue-700">{studyTopicDetails(topic)}</p><p className="mt-2 text-xs font-bold text-blue-700">クリックして詳細を見る</p><button type="button" disabled={saving} onClick={() => requestTopic(topic)} className="relative z-10 mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">この勉強会の開催を希望する</button></article>)}
      {!topics.length && <p className="rounded-3xl bg-white p-8 text-center text-neutral-500 sm:col-span-2">現在、勉強会の候補を準備中です。</p>}
    </section>}
    {detailTopic && <StudyTopicDialog topic={detailTopic} saving={saving} onClose={() => setDetailTopic(null)} onRequest={() => requestTopic(detailTopic)} />}
    {selected && <section ref={formRef} id="study-request-form" className="mt-8 scroll-mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-bold">「{selected.title}」の開催希望</h2><form onSubmit={submit} className="mt-5 space-y-5"><fieldset disabled={saving} className="space-y-5">
      <label className="block text-sm font-bold">LINE登録名 <span className="text-red-600">必須</span><input required maxLength={100} value={lineName} onChange={(event) => setLineName(event.target.value)} placeholder="公式LINEで使っている表示名" className={inputClass} /></label>
      <label className="block text-sm font-bold">希望する曜日・時間帯（任意）<textarea maxLength={1000} rows={3} value={schedule} onChange={(event) => setSchedule(event.target.value)} placeholder="例：平日夜、土曜午後、日程は相談したい" className={inputClass} /></label>
      <label className="block text-sm font-bold">メッセージ（任意）<textarea maxLength={2000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} className={inputClass} /></label>
      <p className="text-xs leading-6 text-neutral-500">入力した内容は、勉強会の開催調整・ご連絡のため管理者が確認します。</p>
      <button disabled={!lineName.trim()} className="w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white disabled:bg-neutral-300">{saving ? "送信中…" : "開催希望を送信する"}</button>
      <button type="button" onClick={() => { setSelectedId(""); setError(""); }} className="w-full text-sm font-bold text-neutral-500">閉じる</button>
    </fieldset>{error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}</form></section>}
    <Link href="/" className="mt-8 inline-block text-sm font-bold text-neutral-600 underline">イベントTOPへ</Link>
  </div></main></>;
}
