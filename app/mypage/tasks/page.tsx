"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SiteHeader from "@/components/SiteHeader";

const supabase = createClient();
type Task = { id: string; event_id: string; event_title: string; title: string; due_at: string | null; completed_at: string | null };

export default function MyTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadTasks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login?redirect=/mypage/tasks"); return; }

    const { data: rows, error } = await supabase.from("event_tasks").select("id, event_id, title, due_at, completed_at").eq("assignee_user_id", user.id).order("completed_at", { ascending: true, nullsFirst: true }).order("due_at", { ascending: true, nullsFirst: false });
    if (error) { setMessage(`タスクを取得できませんでした：${error.message}`); setLoading(false); return; }

    const eventIds = [...new Set((rows ?? []).map((task) => task.event_id))];
    const { data: events, error: eventError } = eventIds.length ? await supabase.from("events").select("id, title").in("id", eventIds) : { data: [], error: null };
    if (eventError) setMessage(`イベント情報を取得できませんでした：${eventError.message}`);
    const names = new Map((events ?? []).map((event) => [event.id, event.title]));
    setTasks((rows ?? []).map((task) => ({ ...task, event_title: names.get(task.event_id) ?? "イベント名未取得" })));
    setLoading(false);
  }, [router]);

  useEffect(() => { const timer = window.setTimeout(() => void loadTasks(), 0); return () => window.clearTimeout(timer); }, [loadTasks]);

  const incomplete = tasks.filter((task) => !task.completed_at);
  const completed = tasks.filter((task) => task.completed_at);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-neutral-100 text-neutral-600">タスクを読み込んでいます...</main>;
  return <><SiteHeader /><main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6"><div className="mx-auto max-w-4xl">
    <Link href="/mypage" className="text-sm font-bold text-neutral-600 underline underline-offset-4">← マイページへ戻る</Link>
    <header className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-bold text-violet-600">MY TASKS</p><h1 className="mt-2 text-3xl font-bold text-neutral-900">担当タスク一覧</h1><p className="mt-3 text-sm text-neutral-500">未完了 {incomplete.length}件</p></header>
    {message && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
    <TaskSection title="未完了のタスク" tasks={incomplete} empty="未完了のタスクはありません。" />
    {completed.length > 0 && <TaskSection title="完了したタスク" tasks={completed} />}
  </div></main></>;
}

function TaskSection({ title, tasks, empty }: { title: string; tasks: Task[]; empty?: string }) {
  return <section className="mt-8"><h2 className="mb-4 text-xl font-bold text-neutral-900">{title}</h2><div className="grid gap-4 sm:grid-cols-2">{tasks.map((task) => <Link key={task.id} href={`/events/${task.event_id}`} className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${task.completed_at ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{task.completed_at ? "完了" : "未完了"}</span>{task.due_at && <span className="text-xs text-neutral-500">締切：{formatDate(task.due_at)}</span>}</div><h3 className={`mt-3 text-lg font-bold ${task.completed_at ? "text-neutral-500 line-through" : "text-neutral-900"}`}>{task.title}</h3><p className="mt-2 text-sm text-neutral-500">{task.event_title}</p></Link>)}</div>{tasks.length === 0 && empty && <p className="rounded-2xl bg-white p-8 text-center text-neutral-500 shadow-sm">{empty}</p>}</section>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
