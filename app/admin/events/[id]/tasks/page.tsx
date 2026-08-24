"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const inputClass = "mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
type Task = { id: string; title: string; details: string | null; due_at: string | null; assignee_user_id: string | null; completion_message: string | null; completed_at: string | null };
type Assignee = { user_id: string; name: string; email: string };

export default function EventTasksAdminPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();
  const [eventTitle, setEventTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace(`/login?redirect=${encodeURIComponent(`/admin/events/${eventId}/tasks`)}`); return; }
    const { data: canEdit } = await supabase.rpc("can_manage_event", { p_event_id: eventId, p_edit_required: true });
    if (!canEdit) { router.replace(`/admin/events/${eventId}`); return; }
    const [eventResult, tasksResult, peopleResult] = await Promise.all([
      supabase.from("events").select("title").eq("id", eventId).maybeSingle(),
      supabase.from("event_tasks").select("id, title, details, due_at, assignee_user_id, completion_message, completed_at").eq("event_id", eventId).order("completed_at", { ascending: true, nullsFirst: true }).order("due_at", { ascending: true, nullsFirst: false }),
      supabase.rpc("get_event_task_assignees", { p_event_id: eventId }),
    ]);
    const error = eventResult.error || tasksResult.error || peopleResult.error;
    if (error || !eventResult.data) { setIsError(true); setMessage(error?.message || "取得できませんでした。"); }
    else { setEventTitle(eventResult.data.title); setTasks((tasksResult.data ?? []) as Task[]); setAssignees((peopleResult.data ?? []) as Assignee[]); }
    setLoading(false);
  }, [eventId, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function clearForm() { setEditingId(null); setTitle(""); setDetails(""); setDueAt(""); setAssigneeId(""); setCompletionMessage(""); }
  function edit(task: Task) { setEditingId(task.id); setTitle(task.title); setDetails(task.details ?? ""); setDueAt(toLocal(task.due_at)); setAssigneeId(task.assignee_user_id ?? ""); setCompletionMessage(task.completion_message ?? ""); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(""); setIsError(false);
    const values = { event_id: eventId, title: title.trim(), details: details.trim() || null, due_at: dueAt ? new Date(dueAt).toISOString() : null, assignee_user_id: assigneeId || null, completion_message: completionMessage.trim() || null, updated_at: new Date().toISOString() };
    const result = editingId ? await supabase.from("event_tasks").update(values).eq("id", editingId) : await supabase.from("event_tasks").insert(values);
    if (result.error) { setIsError(true); setMessage(`保存できませんでした：${result.error.message}`); }
    else { clearForm(); await load(); setMessage(editingId ? "更新しました。" : "登録しました。"); }
    setSaving(false);
  }

  async function remove(task: Task) {
    if (!window.confirm(`「${task.title}」を削除しますか？`)) return;
    setSaving(true); const { error } = await supabase.from("event_tasks").delete().eq("id", task.id);
    if (error) { setIsError(true); setMessage(`削除できませんでした：${error.message}`); } else { if (editingId === task.id) clearForm(); await load(); }
    setSaving(false);
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-neutral-100 text-neutral-600">タスクを読み込んでいます...</main>;
  return <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6"><div className="mx-auto max-w-4xl">
    <Link href={`/admin/events/${eventId}`} className="text-sm font-bold text-neutral-600 underline">← イベント管理へ戻る</Link>
    <header className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-bold text-blue-600">EVENT TASKS</p><h1 className="mt-2 text-3xl font-bold">{eventTitle}のタスク管理</h1></header>
    <form onSubmit={save} className="mt-6 space-y-5 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold">{editingId ? "タスクを編集" : "タスクを登録"}</h2>
      <label className="block text-sm font-bold">表題<input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} /></label>
      <label className="block text-sm font-bold">詳細<textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={5} className={`${inputClass} resize-y`} /></label>
      <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-bold">締め切り<input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={inputClass} /></label><label className="text-sm font-bold">担当<select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={inputClass}><option value="">未指定</option>{assignees.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}（{p.email}）</option>)}</select></label></div>
      <label className="block text-sm font-bold">完了後メッセージ<textarea value={completionMessage} onChange={(e) => setCompletionMessage(e.target.value)} rows={3} placeholder="次のタスクを促すメッセージ" className={`${inputClass} resize-y`} /></label>
      {message && <p className={`rounded-xl p-4 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{message}</p>}
      <div className="flex gap-3"><button disabled={saving || !title.trim()} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:bg-neutral-400">{saving ? "保存中..." : editingId ? "変更を保存" : "登録"}</button>{editingId && <button type="button" onClick={clearForm} className="rounded-xl border px-5 py-3 font-bold">キャンセル</button>}</div>
    </form>
    <section className="mt-6 space-y-4">{tasks.map((task) => <article key={task.id} className="rounded-2xl bg-white p-5 shadow-sm sm:flex sm:items-center sm:gap-5"><div className="flex-1"><span className={`rounded-full px-3 py-1 text-xs font-bold ${task.completed_at ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{task.completed_at ? "完了" : "未完了"}</span><h3 className="mt-3 text-lg font-bold">{task.title}</h3><p className="mt-2 text-sm text-neutral-500">締切：{task.due_at ? formatDate(task.due_at) : "未設定"}／担当：{assignees.find((p) => p.user_id === task.assignee_user_id)?.name ?? "未指定"}</p></div><div className="mt-4 flex gap-4 sm:mt-0"><button onClick={() => edit(task)} className="text-sm font-bold text-blue-600 underline">編集</button><button onClick={() => void remove(task)} className="text-sm font-bold text-red-600 underline">削除</button></div></article>)}{tasks.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-neutral-500">タスクはまだありません。</p>}</section>
  </div></main>;
}

function toLocal(value: string | null) { if (!value) return ""; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
function formatDate(value: string) { return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
