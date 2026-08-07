"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Registration = { id: string; user_id: string; event_id: string; status: string; created_at: string };
type UserRow = { id: string; name: string; email: string | null };
type EventRow = { id: string; title: string; fee: number; start_at: string | null };
type PaymentRow = { id: string; user_event_id: string; amount: number; status: string; method: string | null };
type ParticipantRow = Registration & { userName: string; eventTitle: string; eventFee: number; eventStartAt: string | null; payment: PaymentRow | null };

export default function AdminParticipantsPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"unpaid" | "all">("unpaid");
  const [eventFilter, setEventFilter] = useState("");
  const [sortBy, setSortBy] = useState<"event_date" | "user">("event_date");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [confirmingPaymentId, setConfirmingPaymentId] = useState("");

  const loadPage = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login?redirect=/admin/participants");
      return;
    }

    const { data: adminRole } = await supabase.from("roles").select("id").eq("name", "admin").maybeSingle();
    const { data: userRole } = adminRole
      ? await supabase.from("user_roles").select("id").eq("user_id", user.id).eq("role_id", adminRole.id).maybeSingle()
      : { data: null };
    if (!userRole) {
      router.replace("/mypage");
      return;
    }

    const { data: registrationData, error } = await supabase
      .from("user_events")
      .select("id, user_id, event_id, status, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setMessage(`参加者を取得できませんでした：${error.message}`);
      setLoading(false);
      return;
    }

    const registrations = (registrationData ?? []) as Registration[];
    const userIds = [...new Set(registrations.map((row) => row.user_id))];
    const eventIds = [...new Set(registrations.map((row) => row.event_id))];
    const registrationIds = registrations.map((row) => row.id);
    const [usersResult, eventsResult, paymentsResult] = await Promise.all([
      userIds.length ? supabase.from("users").select("id, name, email").in("id", userIds) : Promise.resolve({ data: [], error: null }),
      eventIds.length ? supabase.from("events").select("id, title, fee, start_at").in("id", eventIds) : Promise.resolve({ data: [], error: null }),
      registrationIds.length ? supabase.from("payments").select("id, user_event_id, amount, status, method").in("user_event_id", registrationIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (usersResult.error || eventsResult.error || paymentsResult.error) {
      setMessage("参加者に関連する情報を取得できませんでした。");
      setLoading(false);
      return;
    }

    const users = new Map(((usersResult.data ?? []) as UserRow[]).map((row) => [row.id, row]));
    const events = new Map(((eventsResult.data ?? []) as EventRow[]).map((row) => [row.id, row]));
    const payments = new Map(((paymentsResult.data ?? []) as PaymentRow[]).map((row) => [row.user_event_id, row]));
    setParticipants(registrations.map((registration) => ({
      ...registration,
      userName: users.get(registration.user_id)?.name || "名前未登録",
      eventTitle: events.get(registration.event_id)?.title || "イベント不明",
      eventFee: events.get(registration.event_id)?.fee ?? 0,
      eventStartAt: events.get(registration.event_id)?.start_at ?? null,
      payment: payments.get(registration.id) ?? null,
    })));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPage(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPage]);

  const incompleteEvents = useMemo(() => {
    const eventMap = new Map<string, { id: string; title: string; startAt: string | null }>();
    participants.filter(isOutstandingPayment).forEach((row) => {
      eventMap.set(row.event_id, { id: row.event_id, title: row.eventTitle, startAt: row.eventStartAt });
    });
    return [...eventMap.values()].sort((a, b) => dateValue(a.startAt) - dateValue(b.startAt));
  }, [participants]);

  const visibleParticipants = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = participants.filter((row) => {
      if (paymentFilter === "unpaid" && !isOutstandingPayment(row)) return false;
      if (eventFilter && row.event_id !== eventFilter) return false;
      return !keyword || `${row.userName} ${row.eventTitle}`.toLowerCase().includes(keyword);
    });

    return filtered.sort((a, b) => {
      const confirmationPriority = Number(b.payment?.status === "confirmation_requested") - Number(a.payment?.status === "confirmation_requested");
      if (confirmationPriority !== 0) return confirmationPriority;
      return sortBy === "user"
        ? a.userName.localeCompare(b.userName, "ja")
        : dateValue(a.eventStartAt) - dateValue(b.eventStartAt);
    });
  }, [eventFilter, participants, paymentFilter, search, sortBy]);

  async function confirmPayment(paymentId: string) {
    setConfirmingPaymentId(paymentId);
    setMessage("");
    const { data, error } = await supabase
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", paymentId)
      .eq("status", "confirmation_requested")
      .select("id, user_event_id, amount, status, method")
      .single();

    if (error) {
      setMessage(`支払いを完了に変更できませんでした：${error.message}`);
    } else {
      setParticipants((current) => current.map((row) =>
        row.payment?.id === paymentId ? { ...row, payment: data as PaymentRow } : row
      ));
    }
    setConfirmingPaymentId("");
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="text-sm font-bold text-neutral-600 underline">← 管理画面へ戻る</Link>
        <header className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold text-blue-600">PARTICIPANTS</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">参加者一覧</h1>
          <p className="mt-3 text-sm text-neutral-500">イベントをまたいで参加者と支払い状況を確認できます。</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-bold text-neutral-600">支払いフィルター
              <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as "unpaid" | "all")} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-normal text-neutral-900">
                <option value="unpaid">未払いユーザー</option>
                <option value="all">すべてのユーザー</option>
              </select>
            </label>
            <label className="text-xs font-bold text-neutral-600">未払いがあるイベント
              <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-normal text-neutral-900">
                <option value="">すべての未完了イベント</option>
                {incompleteEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-neutral-600">並び順
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "event_date" | "user")} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-normal text-neutral-900">
                <option value="event_date">イベント開催日順</option>
                <option value="user">ユーザー順</option>
              </select>
            </label>
            <label className="text-xs font-bold text-neutral-600">検索
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="参加者名・イベント名" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm font-normal text-neutral-900" />
            </label>
          </div>
        </header>

        {message && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
        {loading ? (
          <p className="mt-8 text-center text-neutral-500">読み込み中…</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="hidden grid-cols-[1fr_1.5fr_240px] gap-4 border-b bg-neutral-50 px-6 py-4 text-xs font-bold text-neutral-500 md:grid">
              <span>参加者名</span><span>イベント名</span><span>支払い状況</span>
            </div>
            {visibleParticipants.map((row) => (
              <div key={row.id} className={`grid gap-3 border-b border-neutral-100 px-5 py-5 last:border-0 md:grid-cols-[1fr_1.5fr_240px] md:items-center md:gap-4 md:px-6 ${row.payment?.status === "confirmation_requested" ? "bg-blue-50" : ""}`}>
                <p className="font-bold text-neutral-900">{row.userName}</p>
                <p className="text-sm text-neutral-700">{row.eventTitle}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <PaymentBadge fee={row.eventFee} payment={row.payment} />
                  {row.payment?.status === "confirmation_requested" && (
                    <button
                      type="button"
                      onClick={() => void confirmPayment(row.payment!.id)}
                      disabled={confirmingPaymentId === row.payment.id}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:bg-neutral-400"
                    >
                      {confirmingPaymentId === row.payment.id ? "確認中…" : "確認"}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {visibleParticipants.length === 0 && <p className="p-10 text-center text-neutral-500">該当する参加者はいません。</p>}
          </div>
        )}
      </div>
    </main>
  );
}

function isOutstandingPayment(row: ParticipantRow) {
  const activeRegistration = row.status === "reserved" || row.status === "joined";
  return activeRegistration && row.eventFee > 0 && row.payment?.status !== "paid";
}

function dateValue(value: string | null) {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}

function PaymentBadge({ fee, payment }: { fee: number; payment: PaymentRow | null }) {
  const label = fee === 0 ? "無料" : !payment ? "未選択" : payment.status === "paid" ? "支払済み" : payment.status === "confirmation_requested" ? "確認申請" : payment.status === "pending" ? "支払い待ち" : payment.status;
  const color = label === "支払済み" || label === "無料" ? "bg-green-100 text-green-700" : label === "未選択" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700";
  return <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${color}`}>{label}</span>;
}
