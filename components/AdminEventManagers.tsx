"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
type ManagerRow = { id: string; user_id: string; role: "editor" | "viewer"; name: string; email: string };

export default function AdminEventManagers({ eventId }: { eventId: string }) {
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadManagers = useCallback(async () => {
    const [adminResult, managerResult] = await Promise.all([
      supabase.rpc("is_global_admin"),
      supabase.from("event_managers").select("id, user_id, role").eq("event_id", eventId).order("created_at"),
    ]);
    setIsGlobalAdmin(Boolean(adminResult.data));
    if (managerResult.error) { setMessage(`共同管理者を取得できませんでした：${managerResult.error.message}`); return; }
    const rows = managerResult.data ?? [];
    const userIds = rows.map((row) => row.user_id);
    const { data: users, error: userError } = userIds.length
      ? await supabase.from("users").select("id, name, email").in("id", userIds)
      : { data: [], error: null };
    if (userError) { setMessage(`ユーザー情報を取得できませんでした：${userError.message}`); return; }
    const userMap = new Map((users ?? []).map((user) => [user.id, user]));
    setManagers(rows.map((row) => ({ ...row, role: row.role as "editor" | "viewer", name: userMap.get(row.user_id)?.name || "名前未登録", email: userMap.get(row.user_id)?.email || "メール未登録" })));
  }, [eventId]);

  useEffect(() => { const timer = window.setTimeout(() => void loadManagers(), 0); return () => window.clearTimeout(timer); }, [loadManagers]);

  async function saveManager(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const { error } = await supabase.rpc("set_event_manager", { p_event_id: eventId, p_email: email.trim(), p_role: role });
    setMessage(error ? `追加できませんでした：${error.message}` : "共同管理者を追加しました。");
    if (!error) { setEmail(""); await loadManagers(); }
    setSaving(false);
  }

  async function removeManager(id: string) {
    if (!window.confirm("このユーザーを共同管理から外しますか？")) return;
    setSaving(true);
    const { error } = await supabase.from("event_managers").delete().eq("id", id);
    setMessage(error ? `削除できませんでした：${error.message}` : "共同管理者から外しました。");
    if (!error) await loadManagers();
    setSaving(false);
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-neutral-900">共同管理者</h2>
      <p className="mt-2 text-sm text-neutral-500">共同管理者は編集と参加者対応、閲覧者は情報確認のみ行えます。</p>
      {isGlobalAdmin && (
        <form onSubmit={saveManager} className="mt-5 grid gap-4 rounded-2xl bg-neutral-50 p-5 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <label className="text-sm font-bold">登録済みユーザーのメールアドレス<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal text-neutral-900" /></label>
          <label className="text-sm font-bold">権限<select value={role} onChange={(event) => setRole(event.target.value as "editor" | "viewer")} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal text-neutral-900"><option value="editor">共同管理者</option><option value="viewer">閲覧者</option></select></label>
          <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:bg-neutral-400">追加・更新</button>
        </form>
      )}
      {message && <p className="mt-4 rounded-xl bg-neutral-100 p-4 text-sm">{message}</p>}
      <div className="mt-5 space-y-3">
        {managers.map((manager) => <div key={manager.id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-center"><div className="flex-1"><p className="font-bold">{manager.name}</p><p className="text-sm text-neutral-500">{manager.email}</p></div><span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{manager.role === "editor" ? "共同管理者" : "閲覧者"}</span>{isGlobalAdmin && <button type="button" disabled={saving} onClick={() => void removeManager(manager.id)} className="text-sm font-bold text-red-600 underline">削除</button>}</div>)}
        {managers.length === 0 && <p className="text-sm text-neutral-500">共同管理者はまだいません。</p>}
      </div>
    </section>
  );
}
