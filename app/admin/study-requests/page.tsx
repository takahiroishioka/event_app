"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ShareLinkButton from "@/components/ShareLinkButton";
import { studyTopicDetails, requestStatuses, type StudyHoldingRequest, type StudyRequestStatus, type StudyTopic } from "@/lib/study-requests";

function errorText(cause: unknown) { return cause && typeof cause === "object" && "message" in cause ? String(cause.message) : "通信状態を確認してください。"; }

export default function AdminStudyRequestsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<StudyTopic[]>([]);
  const [requests, setRequests] = useState<StudyHoldingRequest[]>([]);
  const [tab, setTab] = useState<"requests" | "topics">("requests");
  const [statusFilter, setStatusFilter] = useState<StudyRequestStatus | "all">("all");
  const [topicFilter, setTopicFilter] = useState("");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    if (new URLSearchParams(window.location.search).get("tab") === "topics") setTab("topics");
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) { router.replace("/login?redirect=/admin/study-requests"); return; }
      const access = await supabase.rpc("is_global_admin");
      if (access.error) throw access.error;
      if (!access.data) { setAuthorized(false); router.replace("/mypage"); return; }
      setAuthorized(true);
      const [topicResult, requestResult] = await Promise.all([
        supabase.from("study_topics").select("id, title, description, image_url, meeting_format, fee, is_active, sort_order").order("sort_order").order("created_at"),
        supabase.from("study_holding_requests").select("id, topic_id, topic_title, line_name, preferred_schedule, message, status, created_at").order("created_at", { ascending: false }),
      ]);
      if (topicResult.error) throw topicResult.error;
      if (requestResult.error) throw requestResult.error;
      setTopics((topicResult.data ?? []) as StudyTopic[]);
      setRequests((requestResult.data ?? []) as StudyHoldingRequest[]);
    } catch (cause) { setError(`情報を読み込めませんでした：${errorText(cause)}`); }
    finally { setLoading(false); }
  }, [router]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function updateStatus(request: StudyHoldingRequest, status: StudyRequestStatus) {
    if (updating) return;
    setUpdating(request.id); setError(""); setMessage("");
    try {
      const result = await createClient().from("study_holding_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", request.id).select("id, status").single();
      if (result.error) throw result.error;
      setRequests((current) => current.map((row) => row.id === result.data.id ? { ...row, status: result.data.status as StudyRequestStatus } : row));
      setMessage("対応状況を更新しました。");
    } catch (cause) { setError(`更新できませんでした：${errorText(cause)}`); }
    finally { setUpdating(""); }
  }

  const keyword = search.trim().toLowerCase();
  const visible = requests.filter((row) => (statusFilter === "all" || row.status === statusFilter) && (!topicFilter || row.topic_id === topicFilter)
    && (!keyword || `${row.topic_title} ${row.line_name}`.toLowerCase().includes(keyword)));
  const inputClass = "mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-normal text-neutral-900";

  return <main className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-900 sm:px-6"><div className="mx-auto max-w-6xl">
    <Link href="/admin" className="text-sm font-bold text-neutral-600 underline">← 管理者メニューへ</Link>
    <header className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold tracking-widest text-blue-600">STUDY REQUESTS</p><h1 className="mt-3 text-3xl font-bold">勉強会開催希望</h1><p className="mt-4 text-sm leading-7 text-neutral-600">イベントとは別に勉強会の候補を登録し、届いた開催希望を確認します。</p><div className="mt-4 flex flex-wrap items-center gap-3"><Link href="/study-requests" target="_blank" className="text-sm font-bold text-blue-700 underline">公開一覧を開く</Link><ShareLinkButton path="/study-requests" label="LINEリッチメニュー用URLをコピー" /><span className="text-xs text-neutral-500">公式LINEのリッチメニューに設定するURL</span></div></header>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">{message}</p>}
    {loading ? <p className="py-12 text-center text-neutral-500">読み込み中…</p> : authorized && <>
      <div className="my-6 flex flex-wrap gap-3"><button type="button" aria-pressed={tab === "requests"} onClick={() => setTab("requests")} className={`rounded-xl px-5 py-3 text-sm font-bold ${tab === "requests" ? "bg-blue-600 text-white" : "bg-white text-neutral-700"}`}>届いた希望 ({requests.length})</button><button type="button" aria-pressed={tab === "topics"} onClick={() => setTab("topics")} className={`rounded-xl px-5 py-3 text-sm font-bold ${tab === "topics" ? "bg-blue-600 text-white" : "bg-white text-neutral-700"}`}>勉強会の候補を登録・編集</button><button type="button" onClick={() => void load()} className="ml-auto text-sm font-bold text-blue-700 underline">再読み込み</button></div>
      {tab === "requests" ? <>
        <div className="grid gap-4 rounded-3xl bg-white p-5 shadow-sm sm:grid-cols-3"><label className="text-sm font-bold">対応状況<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StudyRequestStatus | "all")} className={inputClass}><option value="all">すべて</option>{Object.entries(requestStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-bold">勉強会<select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)} className={inputClass}><option value="">すべて</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label><label className="text-sm font-bold">検索<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="LINE登録名・勉強会名" className={inputClass} /></label></div>
        <p className="my-5 text-sm text-neutral-500">{visible.length}件</p>
        <div className="space-y-5">{visible.map((row) => <article key={row.id} className="rounded-3xl bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-neutral-500">{new Date(row.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</p><h2 className="mt-2 text-xl font-bold">{row.topic_title}</h2><p className="mt-2 text-sm font-bold text-blue-700">LINE登録名：{row.line_name}</p></div><label className="text-xs font-bold text-neutral-500">対応状況<select value={row.status} disabled={Boolean(updating)} onChange={(event) => void updateStatus(row, event.target.value as StudyRequestStatus)} className={inputClass}>{Object.entries(requestStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><dl className="mt-5 space-y-4 text-sm"><div><dt className="font-bold text-neutral-500">希望する曜日・時間帯</dt><dd className="mt-1 whitespace-pre-wrap break-words">{row.preferred_schedule || "指定なし"}</dd></div>{row.message && <div><dt className="font-bold text-neutral-500">メッセージ</dt><dd className="mt-1 whitespace-pre-wrap break-words">{row.message}</dd></div>}</dl></article>)}</div>
        {!visible.length && <p className="rounded-3xl bg-white p-10 text-center text-neutral-500">該当する開催希望はありません。</p>}
      </> : <div>
        <Link href="/admin/study-requests/new" className="mb-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">勉強会を新規登録</Link>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">{topics.map((topic) => <article key={topic.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
          <Link href={`/admin/study-requests/${topic.id}/edit`} className="block aspect-video bg-neutral-200" aria-label={`${topic.title}を編集`}>
            {topic.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={topic.image_url} alt={topic.title} className="h-full w-full object-cover" />
            ) : <span className="flex h-full items-center justify-center text-sm text-neutral-500">画像未登録</span>}
          </Link>
          <div className="flex flex-1 flex-col p-4"><span className="text-xs font-bold text-neutral-500">{topic.is_active ? "公開中" : "非公開"}</span>
          <h2 className="mt-2 break-words text-lg font-bold">{topic.title}</h2><p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-600">{topic.description}</p>
          <p className="mt-auto pt-4 text-sm font-bold text-blue-700">{studyTopicDetails(topic)}</p><p className="mt-2 text-xs text-neutral-500">開催希望 {requests.filter((row) => row.topic_id === topic.id).length}件</p>
          <Link href={`/admin/study-requests/${topic.id}/edit`} className="mt-4 rounded-xl border border-blue-200 px-4 py-2 text-center text-sm font-bold text-blue-700">編集する</Link></div>
        </article>)}</div>
        {!topics.length && <p className="rounded-3xl bg-white p-8 text-center">「勉強会を新規登録」から登録してください。</p>}
      </div>}
    </>}
  </div></main>;
}
