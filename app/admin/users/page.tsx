"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
type UserPermission = { user_id: string; name: string; email: string; is_admin: boolean; is_ubm: boolean };

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserPermission[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login?redirect=/admin/users"); return; }
    const { data: adminAccess } = await supabase.rpc("is_global_admin");
    if (!adminAccess) { router.replace("/mypage"); return; }
    const { data, error } = await supabase.rpc("get_user_permission_overview");
    if (error) setMessage(`ユーザー一覧を取得できませんでした：${error.message}`);
    else setUsers((data ?? []) as UserPermission[]);
    setLoading(false);
  }, [router]);

  useEffect(() => { const timer = window.setTimeout(() => void loadUsers(), 0); return () => window.clearTimeout(timer); }, [loadUsers]);

  async function toggleUbm(user: UserPermission) {
    setSavingId(user.user_id); setMessage("");
    const { error } = await supabase.rpc("set_ubm_user", { p_email: user.email, p_enabled: !user.is_ubm });
    if (error) setMessage(`権限を変更できませんでした：${error.message}`);
    else await loadUsers();
    setSavingId(null);
  }

  const keyword = search.trim().toLowerCase();
  const visibleUsers = users.filter((user) => !keyword || `${user.name} ${user.email}`.toLowerCase().includes(keyword));

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-neutral-100 text-neutral-600">ユーザーを読み込んでいます...</main>;
  return <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6"><div className="mx-auto max-w-5xl">
    <Link href="/admin" className="text-sm font-bold text-neutral-600 underline underline-offset-4">← 管理画面へ戻る</Link>
    <header className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-bold text-blue-600">USERS</p><h1 className="mt-2 text-3xl font-bold">ユーザー一覧</h1><p className="mt-3 text-sm text-neutral-500">全ユーザーの権限確認とUBM権限の切り替えができます。</p><label className="mt-6 block text-sm font-bold">検索<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="名前・メールアドレス" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 font-normal sm:max-w-md" /></label></header>
    {message && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
    <div className="mt-6 space-y-3">{visibleUsers.map((user) => <article key={user.user_id} className="rounded-2xl bg-white p-5 shadow-sm sm:flex sm:items-center sm:gap-5"><div className="min-w-0 flex-1"><p className="font-bold text-neutral-900">{user.name}</p><p className="mt-1 break-all text-sm text-neutral-500">{user.email}</p></div><div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0">{user.is_admin && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">管理者</span>}<span className={`rounded-full px-3 py-1 text-xs font-bold ${user.is_ubm ? "bg-violet-100 text-violet-700" : "bg-neutral-100 text-neutral-600"}`}>{user.is_ubm ? "UBM" : "一般"}</span><button type="button" onClick={() => void toggleUbm(user)} disabled={savingId === user.user_id || user.is_admin} className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-bold text-neutral-800 disabled:text-neutral-400">{savingId === user.user_id ? "変更中..." : user.is_ubm ? "一般に変更" : "UBMに変更"}</button></div></article>)}{visibleUsers.length === 0 && <p className="rounded-2xl bg-white p-10 text-center text-neutral-500">該当するユーザーはいません。</p>}</div>
  </div></main>;
}
