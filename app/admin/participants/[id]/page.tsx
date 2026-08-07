"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type PaymentData = {
  id: string;
  amount: number;
  status: string;
  method: string | null;
  paid_at: string | null;
  transaction_id: string | null;
};

export default function AdminParticipantEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const registrationId = params.id;
  const [userId, setUserId] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("reserved");
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const loadPage = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(`/admin/participants/${registrationId}`)}`);
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

    const { data: registration, error } = await supabase
      .from("user_events")
      .select("id, user_id, event_id, status")
      .eq("id", registrationId)
      .maybeSingle();
    if (error || !registration) {
      setIsError(true);
      setMessage("参加情報を取得できませんでした。");
      setLoading(false);
      return;
    }

    const [userResult, eventResult, paymentResult] = await Promise.all([
      supabase.from("users").select("id, name, email").eq("id", registration.user_id).maybeSingle(),
      supabase.from("events").select("title").eq("id", registration.event_id).maybeSingle(),
      supabase.from("payments").select("id, amount, status, method, paid_at, transaction_id").eq("user_event_id", registration.id).maybeSingle(),
    ]);
    if (userResult.error || !userResult.data || eventResult.error || !eventResult.data || paymentResult.error) {
      setIsError(true);
      setMessage("参加者の詳細情報を取得できませんでした。");
      setLoading(false);
      return;
    }

    setUserId(registration.user_id);
    setEventTitle(eventResult.data.title);
    setName(userResult.data.name || "");
    setEmail(userResult.data.email || "");
    setRegistrationStatus(registration.status);
    if (paymentResult.data) {
      const savedPayment = paymentResult.data as PaymentData;
      setPayment(savedPayment);
      setPaymentStatus(savedPayment.status);
      setPaymentMethod(savedPayment.method || "");
      setTransactionId(savedPayment.transaction_id || "");
    }
    setLoading(false);
  }, [registrationId, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPage(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPage]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setIsError(false);

    const updates = [
      supabase.from("users").update({ name: name.trim(), email: email.trim() || null, updated_at: new Date().toISOString() }).eq("id", userId),
      supabase.from("user_events").update({ status: registrationStatus, updated_at: new Date().toISOString() }).eq("id", registrationId),
    ];

    if (payment) {
      updates.push(
        supabase.from("payments").update({
          status: paymentStatus,
          method: paymentMethod || null,
          transaction_id: transactionId.trim() || null,
          paid_at: paymentStatus === "paid" ? payment.paid_at || new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq("id", payment.id)
      );
    }

    const results = await Promise.all(updates);
    const error = results.find((result) => result.error)?.error;
    if (error) {
      setIsError(true);
      setMessage(`保存できませんでした：${error.message}`);
    } else {
      setMessage("参加者情報を保存しました。");
      await loadPage();
    }
    setSaving(false);
  }

  if (loading) return <main className="p-10 text-center">読み込み中…</main>;
  const inputClass = "mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 font-normal";

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/participants" className="text-sm font-bold text-neutral-600 underline">← 参加者一覧へ戻る</Link>
        <header className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold text-blue-600">PARTICIPANT</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">参加者情報の変更</h1>
          <p className="mt-3 text-sm text-neutral-500">{eventTitle}</p>
        </header>

        <form onSubmit={handleSave} className="mt-6 space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">参加者情報</h2>
            <label className="mt-5 block text-sm font-bold">参加者名
              <input value={name} onChange={(event) => setName(event.target.value)} required className={inputClass} />
            </label>
            <label className="mt-5 block text-sm font-bold">連絡先メール
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
            </label>
            <label className="mt-5 block text-sm font-bold">参加状態
              <select value={registrationStatus} onChange={(event) => setRegistrationStatus(event.target.value)} className={inputClass}>
                <option value="reserved">参加予定</option>
                <option value="waiting">キャンセル待ち</option>
                <option value="joined">参加済み</option>
                <option value="cancel_requested">キャンセル申請中</option>
                <option value="cancelled">キャンセル済み</option>
                <option value="noshow">欠席</option>
              </select>
            </label>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">支払い情報</h2>
            {!payment ? (
              <p className="mt-4 rounded-xl bg-neutral-100 p-4 text-sm text-neutral-600">支払い情報はまだ登録されていません。</p>
            ) : (
              <>
                <p className="mt-4 text-2xl font-black">{payment.amount.toLocaleString("ja-JP")}円</p>
                <label className="mt-5 block text-sm font-bold">支払い方法
                  <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={inputClass}>
                    <option value="">未選択</option><option value="cash">現金</option><option value="bank">銀行振込</option><option value="stripe">Stripe</option><option value="paypal">PayPal</option><option value="free">無料</option>
                  </select>
                </label>
                <label className="mt-5 block text-sm font-bold">支払い状態
                  <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className={inputClass}>
                    <option value="pending">支払い待ち</option><option value="paid">支払済み</option><option value="failed">失敗</option><option value="refunded">返金済み</option><option value="cancelled">キャンセル</option>
                  </select>
                </label>
                <label className="mt-5 block text-sm font-bold">取引ID（任意）
                  <input value={transactionId} onChange={(event) => setTransactionId(event.target.value)} className={inputClass} />
                </label>
              </>
            )}
          </section>

          <button type="submit" disabled={saving || !name.trim()} className="w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white disabled:bg-neutral-400">{saving ? "保存中…" : "変更を保存"}</button>
          {message && <p className={`rounded-xl p-4 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{message}</p>}
        </form>
      </div>
    </main>
  );
}
