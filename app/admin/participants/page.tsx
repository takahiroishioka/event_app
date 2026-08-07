"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Registration = { id: string; user_id: string; event_id: string; status: string; created_at: string };
type UserRow = { id: string; name: string; email: string | null };
type EventRow = { id: string; title: string; fee: number };
type PaymentRow = { user_event_id: string; amount: number; status: string; method: string | null };
type ParticipantRow = Registration & { userName: string; eventTitle: string; eventFee: number; payment: PaymentRow | null };

export default function AdminParticipantsPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
      eventIds.length ? supabase.from("events").select("id, title, fee").in("id", eventIds) : Promise.resolve({ data: [], error: null }),
      registrationIds.length ? supabase.from("payments").select("user_event_id, amount, status, method").in("user_event_id", registrationIds) : Promise.resolve({ data: [], error: null }),
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
      payment: payments.get(registration.id) ?? null,
    })));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPage(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPage]);

  const visibleParticipants = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return keyword
      ? participants.filter((row) => `${row.userName} ${row.eventTitle}`.toLowerCase().includes(keyword))
      : participants;
  }, [participants, search]);

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="text-sm font-bold text-neutral-600 underline">← 管理画面へ戻る</Link>
        <header className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold text-blue-600">PARTICIPANTS</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">参加者一覧</h1>
          <p className="mt-3 text-sm text-neutral-500">イベントをまたいで参加者と支払い状況を確認できます。</p>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="参加者名・イベント名で検索" className="mt-5 w-full rounded-xl border border-neutral-300 px-4 py-3 sm:max-w-md" />
        </header>

        {message && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
        {loading ? (
          <p className="mt-8 text-center text-neutral-500">読み込み中…</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="hidden grid-cols-[1fr_1.5fr_160px_80px] gap-4 border-b bg-neutral-50 px-6 py-4 text-xs font-bold text-neutral-500 md:grid">
              <span>参加者名</span><span>イベント名</span><span>支払い状況</span><span />
            </div>
            {visibleParticipants.map((row) => (
              <div key={row.id} className="grid gap-3 border-b border-neutral-100 px-5 py-5 last:border-0 md:grid-cols-[1fr_1.5fr_160px_80px] md:items-center md:gap-4 md:px-6">
                <p className="font-bold text-neutral-900">{row.userName}</p>
                <p className="text-sm text-neutral-700">{row.eventTitle}</p>
                <PaymentBadge fee={row.eventFee} payment={row.payment} />
                <Link href={`/admin/participants/${row.id}`} className="text-sm font-bold text-blue-600 underline">編集</Link>
              </div>
            ))}
            {visibleParticipants.length === 0 && <p className="p-10 text-center text-neutral-500">該当する参加者はいません。</p>}
          </div>
        )}
      </div>
    </main>
  );
}

function PaymentBadge({ fee, payment }: { fee: number; payment: PaymentRow | null }) {
  const label = fee === 0 ? "無料" : !payment ? "未選択" : payment.status === "paid" ? "支払済み" : payment.status === "pending" ? "支払い待ち" : payment.status;
  const color = label === "支払済み" || label === "無料" ? "bg-green-100 text-green-700" : label === "未選択" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700";
  return <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${color}`}>{label}</span>;
}
