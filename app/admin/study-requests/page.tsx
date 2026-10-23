"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ShareLinkButton from "@/components/ShareLinkButton";
import StudyTopicImageInput from "@/components/StudyTopicImageInput";
import { studyTopicDetails, requestStatuses, type StudyHoldingRequest, type StudyRequestStatus, type StudyTopic } from "@/lib/study-requests";

const emptyTopic = { title: "", description: "", image_url: "", meeting_format: "", fee: "", is_active: true, sort_order: 0 };
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyTopic);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
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

  async function saveTopic(event: FormEvent) {
    event.preventDefault();
    if (saving || !form.title.trim()) return;
    if (!["zoom", "in_person"].includes(form.meeting_format)) { setError("Zoomまたはリアルを選択してください。"); return; }
    const fee = Number(form.fee);
    if (!form.fee.trim() || !Number.isInteger(fee) || fee < 0 || fee > 2147483647) { setError("金額は0以上の整数で入力してください。"); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const supabase = createClient();
      let imageUrl = form.image_url || null;
      let uploadedPath: string | null = null;
      if (imageFile) {
        const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
        if (!extensions[imageFile.type] || imageFile.size > 5 * 1024 * 1024) throw new Error("5MB以下のJPEG・PNG・WebP・GIFを選択してください。");
        uploadedPath = `study-topics/${crypto.randomUUID()}.${extensions[imageFile.type]}`;
        const upload = await supabase.storage.from("event-images").upload(uploadedPath, imageFile, { contentType: imageFile.type, upsert: false });
        if (upload.error) throw new Error(`画像をアップロードできませんでした：${upload.error.message}`);
        imageUrl = supabase.storage.from("event-images").getPublicUrl(uploadedPath).data.publicUrl;
      }
      const values = { title: form.title.trim(), description: form.description.trim() || null, image_url: imageUrl, meeting_format: form.meeting_format, fee, is_active: form.is_active, sort_order: form.sort_order, updated_at: new Date().toISOString() };
      const result = editingId ? await supabase.from("study_topics").update(values).eq("id", editingId).select("id").single()
        : await supabase.from("study_topics").insert(values).select("id").single();
      if (result.error) {
        if (uploadedPath) await supabase.storage.from("event-images").remove([uploadedPath]);
        throw result.error;
      }
      setEditingId(null); setForm(emptyTopic); setImageFile(null); setMessage("勉強会の候補を保存しました。"); await load();
    } catch (cause) { setError(`保存できませんでした：${errorText(cause)}`); }
    finally { setSaving(false); }
  }

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
      </> : <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form onSubmit={saveTopic} className="h-fit rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{editingId ? "勉強会を編集" : "勉強会を登録"}</h2><fieldset disabled={saving} className="mt-5 space-y-5"><label className="block text-sm font-bold">勉強会名<input required maxLength={150} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} /></label><label className="block text-sm font-bold">説明（一覧では3行まで表示）<textarea rows={3} maxLength={3000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={inputClass} /></label><label className="block text-sm font-bold">開催形式<select required value={form.meeting_format} onChange={(event) => setForm({ ...form, meeting_format: event.target.value })} className={inputClass}><option value="">選択してください</option><option value="zoom">Zoom</option><option value="in_person">リアル</option></select></label><label className="block text-sm font-bold">金額（円）<input type="number" required min={0} max={2147483647} step={1} value={form.fee} onChange={(event) => setForm({ ...form, fee: event.target.value })} placeholder="無料の場合は0" className={inputClass} /></label><StudyTopicImageInput file={imageFile} imageUrl={form.image_url} onChange={(file) => { setImageFile(file); if (!file) setForm({ ...form, image_url: "" }); }} /><label className="block text-sm font-bold">表示順<input type="number" required step={1} value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.valueAsNumber })} className={inputClass} /></label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />公開して開催希望を受け付ける</label><button className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">{saving ? "保存中…" : "保存する"}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyTopic); setImageFile(null); }} className="w-full text-sm font-bold text-neutral-500">編集をやめる</button>}</fieldset></form>
        <div className="space-y-4">{topics.map((topic) => <article key={topic.id} className="rounded-3xl bg-white p-6 shadow-sm"><span className={`rounded-full px-3 py-1 text-xs font-bold ${topic.is_active ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>{topic.is_active ? "公開中" : "非公開"}</span><h2 className="mt-3 text-xl font-bold">{topic.title}</h2><p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-7 text-neutral-600">{topic.description}</p><p className="mt-3 text-sm font-bold text-blue-700">{studyTopicDetails(topic)}</p><p className="mt-3 text-xs text-neutral-500">開催希望 {requests.filter((row) => row.topic_id === topic.id).length}件</p><button type="button" onClick={() => { setEditingId(topic.id); setImageFile(null); setForm({ meeting_format: topic.meeting_format ?? "", fee: topic.fee == null ? "" : String(topic.fee), image_url: topic.image_url ?? "", title: topic.title, description: topic.description ?? "", is_active: topic.is_active, sort_order: topic.sort_order }); }} className="mt-4 text-sm font-bold text-blue-700 underline">編集する</button></article>)}{!topics.length && <p className="rounded-3xl bg-white p-8 text-center text-neutral-500">左のフォームから、勉強会の候補を登録してください。</p>}</div>
      </div>}
    </>}
  </div></main>;
}
