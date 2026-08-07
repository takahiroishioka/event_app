"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type PaymentMethod = "bank" | "cash" | "free";
type PaymentRow = {
  id: string;
  method: PaymentMethod | null;
  status: "pending" | "confirmation_requested" | "paid" | "failed" | "cancelled" | "refunded";
  note: string | null;
};

export default function PaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params.id;
  const [eventTitle, setEventTitle] = useState("");
  const [amount, setAmount] = useState(0);
  const [userEventId, setUserEventId] = useState("");
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const loadPage = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(`/events/${eventId}/payment`)}`);
      return;
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, fee, payment_management_required")
      .eq("id", eventId)
      .maybeSingle();
    if (eventError || !event || event.fee <= 0 || !event.payment_management_required) {
      setIsError(true);
      setMessage("支払い対象のイベントを確認できませんでした。");
      setLoading(false);
      return;
    }

    const { data: registration, error: registrationError } = await supabase
      .from("user_events")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("event_id", eventId)
      .in("status", ["reserved", "joined"])
      .maybeSingle();
    if (registrationError || !registration) {
      setIsError(true);
      setMessage("申込み済みのイベントではありません。");
      setLoading(false);
      return;
    }

    const { data: savedPayment, error: paymentError } = await supabase
      .from("payments")
      .select("id, method, status, note")
      .eq("user_event_id", registration.id)
      .maybeSingle();

    setEventTitle(event.title);
    setAmount(event.fee);
    setUserEventId(registration.id);
    if (paymentError) {
      setIsError(true);
      setMessage(`支払い情報を取得できませんでした：${paymentError.message}`);
    } else if (savedPayment) {
      const typedPayment = savedPayment as PaymentRow;
      setPayment(typedPayment);
      setMethod(event.fee > 0 && event.fee < 1000 ? "cash" : typedPayment.method || "");
      setNote(typedPayment.note || "");
    } else if (event.fee > 0 && event.fee < 1000) {
      setMethod("cash");
    }
    setLoading(false);
  }, [eventId, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPage(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPage]);

  async function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isFree = amount === 0;
    const selectedMethod: PaymentMethod = isFree ? "free" : method as PaymentMethod;
    if ((!isFree && !method) || !userEventId || payment?.status === "paid" || payment?.status === "confirmation_requested") return;
    setSaving(true);
    setMessage("");
    setIsError(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(`/events/${eventId}/payment`)}`);
      return;
    }

    const result = payment
      ? await supabase
          .from("payments")
          .update({ method: selectedMethod, note: isFree ? note.trim() || null : null, updated_at: new Date().toISOString() })
          .eq("id", payment.id)
          .select("id, method, status, note")
          .single()
      : await supabase
          .from("payments")
          .insert({
            user_event_id: userEventId,
            amount,
            method: selectedMethod,
            note: isFree ? note.trim() || null : null,
          })
          .select("id, method, status, note")
          .single();

    if (result.error) {
      setIsError(true);
      setMessage(`支払い方法を保存できませんでした：${result.error.message}`);
    } else {
      setPayment(result.data as PaymentRow);
      if (selectedMethod === "cash" || selectedMethod === "free") {
        router.push(`/events/${eventId}`);
        router.refresh();
        return;
      }
      setMessage("支払い方法を登録しました。");
    }
    setSaving(false);
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <Link href={`/events/${eventId}`} className="text-sm font-bold text-neutral-600 underline">← イベント詳細へ戻る</Link>
          <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-bold text-blue-600">PAYMENT</p>
            <h1 className="mt-2 text-3xl font-bold text-neutral-900">{amount === 0 && !loading ? "備考の登録" : "支払い方法の選択"}</h1>

            {loading ? (
              <p className="mt-6 text-neutral-500">読み込み中…</p>
            ) : isError && !eventTitle ? (
              <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{message}</p>
            ) : (
              <form onSubmit={savePayment} className="mt-7">
                <div className="rounded-2xl bg-neutral-50 p-5">
                  <p className="font-bold text-neutral-900">{eventTitle}</p>
                  <p className="mt-2 text-2xl font-black text-neutral-900">{amount.toLocaleString("ja-JP")}円</p>
                  {payment && <p className="mt-2 text-sm text-neutral-500">状態：{payment.status === "paid" ? "支払済み" : payment.status === "confirmation_requested" ? "確認待ち" : "支払い待ち"}</p>}
                </div>

                {amount === 0 ? (
                  <label className="mt-6 block text-sm font-bold">備考（任意）
                    <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} placeholder="主催者への連絡事項など" className="mt-2 w-full rounded-xl border border-neutral-300 p-4 font-normal" />
                  </label>
                ) : (
                  <div className={`mt-6 grid gap-4 ${amount >= 1000 ? "sm:grid-cols-2" : ""}`}>
                    {amount >= 1000 && (
                      <label className={`cursor-pointer rounded-2xl border-2 p-5 ${method === "bank" ? "border-blue-600 bg-blue-50" : "border-neutral-200"}`}>
                        <input type="radio" name="payment-method" value="bank" checked={method === "bank"} disabled={payment?.status === "paid" || payment?.status === "confirmation_requested"} onChange={() => setMethod("bank")} className="mr-2" />
                        <span className="font-bold">銀行振込</span>
                        <p className="mt-2 text-xs leading-5 text-neutral-500">指定口座へお振込みいただきます。</p>
                      </label>
                    )}
                    <label className={`cursor-pointer rounded-2xl border-2 p-5 ${method === "cash" ? "border-blue-600 bg-blue-50" : "border-neutral-200"}`}>
                      <input type="radio" name="payment-method" value="cash" checked={method === "cash"} disabled={payment?.status === "paid" || payment?.status === "confirmation_requested"} onChange={() => setMethod("cash")} className="mr-2" />
                      <span className="font-bold">現金支払い</span>
                      <p className="mt-2 text-xs leading-5 text-neutral-500">当日、会場で現金をお支払いいただきます。</p>
                    </label>
                  </div>
                )}

                <button type="submit" disabled={(amount > 0 && !method) || saving || payment?.status === "paid" || payment?.status === "confirmation_requested"} className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white disabled:bg-neutral-400">
                  {saving ? "保存中…" : amount === 0 ? "備考を保存" : payment ? "支払い方法を変更" : "支払い方法を登録"}
                </button>
                {message && <p className={`mt-4 rounded-xl p-4 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{message}</p>}
              </form>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
