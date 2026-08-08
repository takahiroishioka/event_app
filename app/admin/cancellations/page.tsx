"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type CancellationRow = {
  id: string;
  user_id: string;
  event_id: string;
  cancellation_requested_at: string | null;
  cancellation_reason: string | null;
  refund_method: string | null;
  userName: string;
  eventTitle: string;
  paymentStatus: string | null;
  amount: number | null;
};

export default function AdminCancellationsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<CancellationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login?redirect=/admin/cancellations"); return; }

    const { data: role } = await supabase.from("roles").select("id").eq("name", "admin").maybeSingle();
    const { data: userRole } = role ? await supabase.from("user_roles").select("id").eq("user_id", user.id).eq("role_id", role.id).maybeSingle() : { data: null };
    if (!userRole) { router.replace("/mypage"); return; }

    const { data, error } = await supabase.from("user_events")
      .select("id, user_id, event_id, cancellation_requested_at, cancellation_reason, refund_method")
      .eq("status", "cancel_requested")
      .order("cancellation_requested_at", { ascending: true });
    if (error) { setMessage(`申請を取得できませんでした：${error.message}`); setLoading(false); return; }

    const rows = data ?? [];
    const userIds = [...new Set(rows.map((row) => row.user_id))];
    const eventIds = [...new Set(rows.map((row) => row.event_id))];
    const ids = rows.map((row) => row.id);
    const [usersResult, eventsResult, paymentsResult] = await Promise.all([
      userIds.length ? supabase.from("users").select("id, name").in("id", userIds) : Promise.resolve({ data: [], error: null }),
      eventIds.length ? supabase.from("events").select("id, title").in("id", eventIds) : Promise.resolve({ data: [], error: null }),
      ids.length ? supabase.from("payments").select("user_event_id, status, amount").in("user_event_id", ids) : Promise.resolve({ data: [], error: null }),
    ]);
    if (usersResult.error || eventsResult.error || paymentsResult.error) { setMessage("申請の関連情報を取得できませんでした。"); setLoading(false); return; }

    const users = new Map((usersResult.data ?? []).map((row) => [row.id, row.name]));
    const events = new Map((eventsResult.data ?? []).map((row) => [row.id, row.title]));
    const payments = new Map((paymentsResult.data ?? []).map((row) => [row.user_event_id, row]));
    setRequests(rows.map((row) => ({
      ...row,
      userName: users.get(row.user_id) || "名前未登録",
      eventTitle: events.get(row.event_id) || "イベント不明",
      paymentStatus: payments.get(row.id)?.status ?? null,
      amount: payments.get(row.id)?.amount ?? null,
    })));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRequests(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  async function approveCancellation(id: string) {
    if (!window.confirm("返金・キャンセル対応を完了しますか？")) return;
    setProcessingId(id);
    setMessage("");
    const { error } = await supabase.rpc("approve_event_cancellation", { p_user_event_id: id });
    if (error) setMessage(`処理を完了できませんでした：${error.message}`);
    else await loadRequests();
    setProcessingId("");
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-sm font-bold text-neutral-600 underline">← 管理画面へ戻る</Link>
        <header className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold text-blue-600">CANCELLATIONS</p>
          <h1 className="mt-2 text-3xl font-bold">キャンセル・返金申請</h1>
          <p className="mt-3 text-sm text-neutral-500">支払済みの場合は返金方法を確認してから完了してください。</p>
        </header>
        {message && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
        {loading ? <p className="mt-8 text-center text-neutral-500">読み込み中…</p> : (
          <div className="mt-6 space-y-4">
            {requests.map((request) => (
              <article key={request.id} className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-bold text-blue-600">{request.userName}</p>
                    <h2 className="mt-2 text-xl font-bold">{request.eventTitle}</h2>
                    <div className="mt-3 space-y-1 text-sm text-neutral-600">
                      <p>申請日：{formatDate(request.cancellation_requested_at)}</p>
                      <p>支払い：{paymentLabel(request.paymentStatus)}{request.amount !== null ? `（${request.amount.toLocaleString("ja-JP")}円）` : ""}</p>
                      {request.paymentStatus === "paid" && <p className="font-bold">返金方法：{request.refund_method === "bank" ? "銀行振込（手数料は参加者負担）" : request.refund_method === "hand" ? "手渡し" : "未選択"}</p>}
                      {request.cancellation_reason && <p>理由：{request.cancellation_reason}</p>}
                    </div>
                  </div>
                  <button type="button" onClick={() => void approveCancellation(request.id)} disabled={processingId === request.id || (request.paymentStatus === "paid" && !request.refund_method)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:bg-neutral-400">
                    {processingId === request.id ? "処理中…" : request.paymentStatus === "paid" ? "返金完了・承認" : "キャンセル承認"}
                  </button>
                </div>
              </article>
            ))}
            {requests.length === 0 && <p className="rounded-3xl bg-white p-10 text-center text-neutral-500">対応待ちの申請はありません。</p>}
          </div>
        )}
      </div>
    </main>
  );
}

function paymentLabel(status: string | null) {
  if (status === "paid") return "支払済み";
  if (status === "refunded") return "返金済み";
  if (status === "pending" || status === "confirmation_requested") return "未確認";
  return status ? status : "支払いなし";
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "日時不明";
}
